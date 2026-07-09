import pytest

from agent.five_whys_agent import FiveWhysAgent
from core.memory import make_checkpointer


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
async def test_start_investigation_tracks_project_id_for_later_calls(agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-042",
    )
    investigation_id = started["investigation_id"]

    result = await agent.submit_gemba(investigation_id, result="OK", notes="fine")

    assert agent._config(investigation_id)["configurable"]["thread_id"] == (
        f"proj-042:{investigation_id}"
    )
    assert result["investigation_id"] == investigation_id
