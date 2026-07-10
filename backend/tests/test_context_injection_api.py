import pytest

from api.main import app


@pytest.mark.asyncio
async def test_context_injection_endpoint_appends_domain_context(async_client):
    agent = app.state.five_whys_agent
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
