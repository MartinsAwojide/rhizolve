import uuid

import pytest
from sqlalchemy import select

from agent.five_whys_agent import FiveWhysAgent
from core.db import make_engine, make_sessionmaker
from core.memory import make_checkpointer
from models.investigation import Investigation, InvestigationStatus
from models.project import Project, Visibility
from models.user import User


async def _pinned_why_generator(state):
    return {
        "pending_hypotheses": [
            {
                "hypothesis": "seal wear on the fill valve",
                "branch_path": f"{state['current_branch_path']}.h1",
                "depth": state["current_depth"],
                "gemba_instructions": "inspect fill valve seal",
            }
        ]
    }


async def _pinned_root_cause_validator(state):
    active = state.get("active_hypothesis")
    if active is None:
        return {}
    why_node = next(
        n for n in state["why_nodes"] if n["branch_path"] == active["branch_path"]
    )
    updated_node = {**why_node, "is_root_cause": False}
    return {
        "why_nodes": [updated_node],
        "current_depth": why_node["depth"],
        "current_branch_path": why_node["branch_path"],
    }


async def _pinned_countermeasure_generator(state):
    active = state.get("active_hypothesis")
    if active is None:
        return {}
    why_node = next(
        n for n in state["why_nodes"] if n["branch_path"] == active["branch_path"]
    )
    domain_context = state.get("domain_context")
    countermeasure = (
        f"countermeasure v2 (feedback: {domain_context})"
        if domain_context
        else "countermeasure v1"
    )
    updated_node = {**why_node, "countermeasure": countermeasure}
    return {"why_nodes": [updated_node]}


@pytest.fixture
async def agent(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    monkeypatch.setattr(
        "agent.graph.root_cause_validator", _pinned_root_cause_validator
    )
    monkeypatch.setattr(
        "agent.graph.countermeasure_generator", _pinned_countermeasure_generator
    )
    checkpointer, ctx = await make_checkpointer()
    try:
        yield FiveWhysAgent(checkpointer)
    finally:
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_graph_reaches_hypothesis_review_on_start(agent):
    result = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    assert result["status"] == "awaiting_gemba"
    assert result["interrupt_type"] == "hypothesis_review"


@pytest.mark.asyncio
async def test_submit_gemba_advances_past_dispatch_and_records_result(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]

    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["gemba_result"] == "NOK"
    assert node["gemba_notes"] == "seal cracked"
    assert snapshot.next != ("gemba_check",)


@pytest.mark.asyncio
async def test_status_includes_pending_hypotheses_on_hypothesis_review(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )

    status = await agent.get_status(started["investigation_id"])

    assert status["interrupt_type"] == "hypothesis_review"
    assert status["pending_hypotheses"][0]["hypothesis"] == (
        "seal wear on the fill valve"
    )


@pytest.mark.asyncio
async def test_status_includes_node_on_validator_review(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    status = await agent.get_status(investigation_id)

    assert status["interrupt_type"] == "validator_review"
    assert status["node"]["branch_path"] == "root.h1"
    assert status["pending_hypotheses"] == []


@pytest.mark.asyncio
async def test_get_tree_returns_current_why_nodes(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    tree = await agent.get_tree(investigation_id)

    assert [n["branch_path"] for n in tree] == ["root.h1"]
    assert tree[0]["hypothesis"] == "seal wear on the fill valve"


@pytest.mark.asyncio
async def test_get_tree_reflects_gemba_result_after_submission(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]

    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    tree = await agent.get_tree(investigation_id)
    node = next(n for n in tree if n["branch_path"] == "root.h1")
    assert node["gemba_result"] == "NOK"
    assert node["gemba_notes"] == "seal cracked"


@pytest.mark.asyncio
async def test_submit_gemba_with_attachments_persists_on_node(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]

    attachments = [
        {
            "id": "a1",
            "type": "audio",
            "url": "/attachments/a1.m4a",
            "filename": "a1.m4a",
            "content_type": "audio/m4a",
            "transcription": "Spring visibly cracked",
            "transcription_status": "complete",
        }
    ]
    await agent.submit_gemba(
        investigation_id, result="NOK", notes="seal cracked", attachments=attachments
    )

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["attachments"] == attachments


@pytest.mark.asyncio
async def test_submit_gemba_flags_conflict_instead_of_overwriting_closed_branch(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]

    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    config = agent._config(investigation_id)
    closed_node = next(
        n
        for n in (await agent.graph.aget_state(config)).values["why_nodes"]
        if n["branch_path"] == "root.h1"
    )
    # Simulate a stale offline-synced result arriving for a branch that has
    # since been closed live -- force the pointer back onto it.
    await agent.graph.aupdate_state(
        config,
        {
            "active_hypothesis": {
                "hypothesis": closed_node["hypothesis"],
                "branch_path": "root.h1",
                "depth": closed_node["depth"],
                "gemba_instructions": "",
            }
        },
        as_node="gemba_dispatcher",
    )

    result = await agent.submit_gemba(
        investigation_id, result="OK", notes="synced from device"
    )

    assert result == {
        "conflict": True,
        "branch_path": "root.h1",
        "existing_result": "NOK",
        "incoming_result": "OK",
        "incoming_notes": "synced from device",
    }
    unchanged_node = next(
        n
        for n in (await agent.graph.aget_state(config)).values["why_nodes"]
        if n["branch_path"] == "root.h1"
    )
    assert unchanged_node["gemba_result"] == "NOK"


@pytest.mark.asyncio
async def test_submit_gemba_noop_when_no_active_hypothesis(monkeypatch):
    async def _empty_why_generator(state):
        return {"pending_hypotheses": []}

    monkeypatch.setattr("agent.graph.why_generator", _empty_why_generator)
    checkpointer, ctx = await make_checkpointer()
    try:
        empty_agent = FiveWhysAgent(checkpointer)
        started = await empty_agent.start_investigation(
            phenomenon="Glue overflowed",
            domain="manufacturing",
            system_or_process_context="glue tank fill station, line 3",
            max_depth=0,
        )
        # No hypothesis was ever generated/dispatched, so root_cause_validator
        # and countermeasure_generator both no-op (no active_hypothesis), but
        # interrupt_after=["root_cause_validator"] still pauses the graph --
        # _validate_router already resolved to countermeasure_generator
        # (current_depth 1 >= max_depth 0) before the pause takes effect.
        assert started["status"] == "awaiting_gemba"
        assert started["interrupt_type"] == "validator_review"

        result = await empty_agent.submit_gemba(
            started["investigation_id"], result="NOK", notes="n/a"
        )
        assert result["investigation_id"] == started["investigation_id"]
        assert result["interrupt_type"] == "validator_review"
    finally:
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_submit_validator_review_override_forces_countermeasure(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        max_depth=5,
    )
    investigation_id = started["investigation_id"]
    gemba_result = await agent.submit_gemba(
        investigation_id, result="NOK", notes="seal cracked"
    )
    assert gemba_result["interrupt_type"] == "validator_review"

    result = await agent.submit_validator_review(
        investigation_id, user_override_root_cause=True
    )
    assert result["interrupt_type"] == "countermeasure_review"

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["is_root_cause"] is True


@pytest.mark.asyncio
async def test_submit_validator_review_without_override_keeps_ai_decision(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        max_depth=5,
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    result = await agent.submit_validator_review(
        investigation_id, user_override_root_cause=False
    )
    assert result["interrupt_type"] == "hypothesis_review"

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["is_root_cause"] is False


@pytest.mark.asyncio
async def test_submit_validator_review_probe_direction_reaches_why_generator(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        max_depth=5,
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    await agent.submit_validator_review(
        investigation_id,
        user_override_root_cause=False,
        user_probe_direction="check the upstream regulator too",
    )

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    assert "check the upstream regulator too" in snapshot.values["domain_context"]


@pytest.mark.asyncio
async def test_submit_countermeasure_review_accepted_with_edit_overwrites_countermeasure(
    agent,
):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        max_depth=1,
    )
    investigation_id = started["investigation_id"]
    gemba_result = await agent.submit_gemba(
        investigation_id, result="NOK", notes="seal cracked"
    )
    assert gemba_result["interrupt_type"] == "validator_review"

    validator_result = await agent.submit_validator_review(
        investigation_id, user_override_root_cause=False
    )
    assert validator_result["interrupt_type"] == "countermeasure_review"

    result = await agent.submit_countermeasure_review(
        investigation_id, accepted=True, edit="replace the seal immediately"
    )
    assert result["status"] == "complete"

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["countermeasure"] == "replace the seal immediately"


@pytest.mark.asyncio
async def test_submit_countermeasure_review_rejected_regenerates_with_feedback(
    agent,
):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        max_depth=1,
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")
    await agent.submit_validator_review(
        investigation_id, user_override_root_cause=False
    )

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["countermeasure"] == "countermeasure v1"

    result = await agent.submit_countermeasure_review(
        investigation_id, accepted=False, feedback="needs a poka-yoke element"
    )
    assert result["interrupt_type"] == "countermeasure_review"

    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert "needs a poka-yoke element" in node["countermeasure"]
    assert node["countermeasure"] != "countermeasure v1"


@pytest.mark.asyncio
async def test_inject_context_appends_domain_context_with_timestamp(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-001",
    )
    investigation_id = started["investigation_id"]
    thread_id = f"proj-001:{investigation_id}"

    await agent.inject_context(thread_id, "Pump replaced 3 days ago")

    snapshot = await agent.graph.aget_state({"configurable": {"thread_id": thread_id}})
    assert "Pump replaced 3 days ago" in snapshot.values["domain_context"]


@pytest.mark.asyncio
async def test_submit_hypothesis_review_regenerates_with_context():
    async def _context_sensitive_why_generator(state):
        domain_context = state.get("domain_context")
        hypothesis = (
            f"upstream regulator fault ({domain_context})"
            if domain_context
            else "seal wear on the fill valve"
        )
        return {
            "pending_hypotheses": [
                {
                    "hypothesis": hypothesis,
                    "branch_path": f"{state['current_branch_path']}.h1",
                    "depth": state["current_depth"],
                    "gemba_instructions": "inspect",
                }
            ]
        }

    checkpointer, ctx = await make_checkpointer()
    try:
        with_patch = pytest.MonkeyPatch()
        with_patch.setattr(
            "agent.graph.why_generator", _context_sensitive_why_generator
        )
        try:
            regen_agent = FiveWhysAgent(checkpointer)
            started = await regen_agent.start_investigation(
                phenomenon="Glue overflowed",
                domain="manufacturing",
                system_or_process_context="glue tank fill station, line 3",
            )
            investigation_id = started["investigation_id"]
            assert started["interrupt_type"] == "hypothesis_review"

            config = regen_agent._config(investigation_id)
            before = await regen_agent.graph.aget_state(config)
            depth_before = before.values["current_depth"]
            branch_before = before.values["current_branch_path"]

            result = await regen_agent.submit_hypothesis_review(
                investigation_id,
                regenerate_with_context="check the upstream regulator too",
            )
            assert result["interrupt_type"] == "hypothesis_review"

            snapshot = await regen_agent.graph.aget_state(config)
            assert snapshot.values["pending_hypotheses"][0]["hypothesis"] == (
                "upstream regulator fault (check the upstream regulator too)"
            )
            assert snapshot.values["current_depth"] == depth_before
            assert snapshot.values["current_branch_path"] == branch_before

            await regen_agent.submit_gemba(
                investigation_id, result="NOK", notes="confirmed"
            )
            snapshot = await regen_agent.graph.aget_state(config)
            node = next(
                n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
            )
            assert "upstream regulator fault" in node["hypothesis"]
            assert "check the upstream regulator too" in node["hypothesis"]
        finally:
            with_patch.undo()
    finally:
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_submit_hypothesis_review_edits_pending_list(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]

    edited = [
        {
            "hypothesis": "operator error during fill",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "review operator log",
        }
    ]
    result = await agent.submit_hypothesis_review(investigation_id, hypotheses=edited)
    assert result["interrupt_type"] == "gemba_result_review"

    gemba_result = await agent.submit_gemba(
        investigation_id, result="NOK", notes="confirmed"
    )
    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["hypothesis"] == "operator error during fill"
    assert gemba_result["investigation_id"] == investigation_id


@pytest.mark.asyncio
async def test_submit_hypothesis_review_confirm_without_edits_advances_normally(
    agent,
):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    assert started["interrupt_type"] == "hypothesis_review"

    result = await agent.submit_hypothesis_review(investigation_id)
    assert result["interrupt_type"] != "hypothesis_review"


@pytest.mark.asyncio
async def test_reset_tree_soft_suspends_descendants_via_agent(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    await agent.reset_tree(investigation_id, "root.h1", "soft")

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "suspended"


@pytest.mark.asyncio
async def test_reset_tree_hard_deletes_descendants_via_agent(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    await agent.reset_tree(investigation_id, "root.h1", "hard")

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "deleted"


@pytest.mark.asyncio
async def test_reset_tree_moves_head_pointer(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    await agent.reset_tree(investigation_id, "root.h1", "soft")

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    assert snapshot.values["current_branch_path"] == "root.h1"


@pytest.mark.asyncio
async def test_reset_tree_moves_current_depth_to_target_node_depth(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
    )
    investigation_id = started["investigation_id"]
    await agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    config = agent._config(investigation_id)
    snapshot = await agent.graph.aget_state(config)
    target_node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )

    # Simulate a stale current_depth (as if the driver had probed deeper
    # before resetting back to this shallower branch) — reset_tree must
    # correct it to the target node's own depth, not leave it stale.
    await agent.graph.aupdate_state(
        config, {"current_depth": target_node["depth"] + 3}, as_node="intake"
    )

    await agent.reset_tree(investigation_id, "root.h1", "soft")

    snapshot = await agent.graph.aget_state(config)
    assert snapshot.values["current_depth"] == target_node["depth"]


@pytest.mark.asyncio
async def test_start_investigation_tracks_project_id_for_later_calls(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-042",
    )
    investigation_id = started["investigation_id"]

    await agent.submit_gemba(investigation_id, result="OK", notes="fine")

    assert agent._config(investigation_id)["configurable"]["thread_id"] == (
        f"proj-042:{investigation_id}"
    )


@pytest.fixture
async def db_sessionmaker():
    engine = make_engine()
    sessionmaker = make_sessionmaker(engine)
    yield sessionmaker
    await engine.dispose()


@pytest.fixture
async def project_id(db_sessionmaker):
    async with db_sessionmaker() as session:
        user = User(clerk_user_id=f"clerk_user_{uuid.uuid4()}")
        session.add(user)
        await session.flush()
        project = Project(name="Test", visibility=Visibility.PRIVATE, owner_id=user.id)
        session.add(project)
        await session.commit()
        await session.refresh(project)
        yield project.id


@pytest.fixture
async def synced_agent(monkeypatch, db_sessionmaker):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    monkeypatch.setattr(
        "agent.graph.root_cause_validator", _pinned_root_cause_validator
    )
    checkpointer, ctx = await make_checkpointer()
    try:
        yield FiveWhysAgent(checkpointer, db_sessionmaker=db_sessionmaker)
    finally:
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_start_investigation_syncs_investigation_row(
    synced_agent, db_sessionmaker, project_id
):
    started = await synced_agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id=project_id,
    )
    investigation_id = started["investigation_id"]

    async with db_sessionmaker() as session:
        row = await session.get(Investigation, investigation_id)

    assert row is not None
    assert row.project_id == project_id
    assert row.status == InvestigationStatus.AWAITING_GEMBA
    assert row.interrupt_type == "hypothesis_review"
    assert row.node_count == 0


@pytest.mark.asyncio
async def test_submit_gemba_updates_investigation_row_node_counts(
    synced_agent, db_sessionmaker, project_id
):
    started = await synced_agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id=project_id,
    )
    investigation_id = started["investigation_id"]

    await synced_agent.submit_gemba(investigation_id, result="NOK", notes="seal cracked")

    async with db_sessionmaker() as session:
        row = await session.get(Investigation, investigation_id)

    assert row.node_pending_count == 0


@pytest.mark.asyncio
async def test_agent_without_sessionmaker_does_not_write_investigation_row(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-no-sync",
    )
    investigation_id = started["investigation_id"]

    engine = make_engine()
    sessionmaker = make_sessionmaker(engine)
    async with sessionmaker() as session:
        result = await session.execute(
            select(Investigation).where(Investigation.id == investigation_id)
        )
        row = result.scalar_one_or_none()
    await engine.dispose()

    assert row is None
