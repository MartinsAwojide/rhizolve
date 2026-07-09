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


@pytest.fixture
async def agent(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
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
        assert started["status"] == "complete"

        result = await empty_agent.submit_gemba(
            started["investigation_id"], result="NOK", notes="n/a"
        )
        assert result["investigation_id"] == started["investigation_id"]
    finally:
        await ctx.__aexit__(None, None, None)


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
