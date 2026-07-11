import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub
from models.project_member import Role


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
async def driver_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    original_presence = app.state.presence
    pubsub = RedisPubSub(app.state.redis)
    agent = FiveWhysAgent(checkpointer, pubsub=pubsub)
    app.state.five_whys_agent = agent
    app.state.presence = PresenceTracker(app.state.redis, ttl_seconds=8)
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
        app.state.presence = original_presence
        await ctx.__aexit__(None, None, None)


async def _create_project(authed_client) -> str:
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


async def _start_investigation(agent, project_id: str) -> str:
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id=project_id,
    )
    return started["investigation_id"]


def _reset_body():
    return {"branch_path": "root.h1", "reset_type": "soft"}


@pytest.mark.asyncio
async def test_non_driver_gets_403(
    authed_client, async_client, monkeypatch, add_project_member, driver_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(driver_env, project_id)
    heartbeat_url = (
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}"
        "/presence/heartbeat"
    )
    reset_url = (
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/tree/reset"
    )

    # authed_client (owner) heartbeats and becomes driver.
    await authed_client.post(heartbeat_url, json={})

    # A second member never heartbeats, so is not the driver.
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)
    r = await async_client.post(reset_url, json=_reset_body())
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_current_driver_allowed(authed_client, driver_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(driver_env, project_id)
    heartbeat_url = (
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}"
        "/presence/heartbeat"
    )
    reset_url = (
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/tree/reset"
    )

    await authed_client.post(heartbeat_url, json={})
    r = await authed_client.post(reset_url, json=_reset_body())
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_no_cached_driver_yet_returns_403(authed_client, driver_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(driver_env, project_id)
    reset_url = (
        f"/api/v1/projects/{project_id}/investigations/{investigation_id}/tree/reset"
    )

    r = await authed_client.post(reset_url, json=_reset_body())
    assert r.status_code == 403
