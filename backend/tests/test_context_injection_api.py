import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
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


@pytest.mark.asyncio
async def test_context_injection_endpoint_appends_domain_context(
    async_client, monkeypatch
):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    agent = FiveWhysAgent(checkpointer)
    app.state.five_whys_agent = agent
    try:
        await _run_context_injection_test(async_client, agent)
    finally:
        app.state.five_whys_agent = original_agent
        await ctx.__aexit__(None, None, None)


async def _run_context_injection_test(async_client, agent):
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-001",
    )
    investigation_id = started["investigation_id"]

    r = await async_client.post(
        f"/api/v1/projects/proj-001/investigations/{investigation_id}/context",
        json={"context": "Pump replaced 3 days ago"},
    )
    assert r.status_code == 200

    config = {"configurable": {"thread_id": f"proj-001:{investigation_id}"}}
    snapshot = await agent.graph.aget_state(config)
    assert "Pump replaced 3 days ago" in snapshot.values["domain_context"]
