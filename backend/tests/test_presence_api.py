import asyncio
import uuid

import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub, make_channel
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
async def presence_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    original_presence = app.state.presence
    pubsub = RedisPubSub(app.state.redis)
    agent = FiveWhysAgent(checkpointer, pubsub=pubsub)
    app.state.five_whys_agent = agent
    app.state.presence = PresenceTracker(app.state.redis, ttl_seconds=1)
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


@pytest.mark.asyncio
async def test_heartbeat_returns_current_snapshot(authed_client, presence_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(presence_env, project_id)

    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/presence/heartbeat"
    r = await authed_client.post(url, json={})
    assert r.status_code == 200
    users = r.json()["users"]
    assert len(users) == 1


@pytest.mark.asyncio
async def test_second_user_heartbeat_publishes_user_joined(
    authed_client, async_client, monkeypatch, add_project_member, presence_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(presence_env, project_id)
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/presence/heartbeat"

    async def listen():
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "user_joined":
                    return event

    listener = asyncio.create_task(listen())
    await asyncio.sleep(0.1)
    r = await async_client.post(url, json={})
    assert r.status_code == 200

    event = await listener
    assert event["type"] == "user_joined"


@pytest.mark.asyncio
async def test_editing_true_then_false_publishes_user_editing_immediately(
    authed_client, presence_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(presence_env, project_id)

    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/presence/heartbeat"

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    async def listen_for_editing(count: int):
        results = []
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "user_editing":
                    results.append(event)
                    if len(results) >= count:
                        return results

    listener = asyncio.create_task(listen_for_editing(2))
    await asyncio.sleep(0.1)

    await authed_client.post(url, json={"editing": True, "editing_node": "root.h1"})
    await authed_client.post(url, json={"editing": False})

    events = await listener
    assert events[0]["payload"]["editing"] is True
    assert events[1]["payload"]["editing"] is False


@pytest.mark.asyncio
async def test_presence_heartbeat_non_member_403(
    authed_client, monkeypatch, presence_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(presence_env, project_id)

    stranger_id = f"clerk_user_{uuid.uuid4()}"

    async def _payload(request):
        return {"sub": stranger_id, "email": f"{stranger_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    authed_client.headers["Authorization"] = f"Bearer {stranger_id}"
    await authed_client.post("/api/v1/auth/sync")

    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/presence/heartbeat"
    r = await authed_client.post(url, json={})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_disconnected_user_removed_within_ttl(
    authed_client, async_client, monkeypatch, add_project_member, presence_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(presence_env, project_id)
    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/presence/heartbeat"

    # authed_client is still the project owner here (add_project_member below
    # switches the shared client's identity) — its heartbeat is user A's key.
    await authed_client.post(url, json={})

    # async_client is the same object as authed_client; add_project_member
    # re-authenticates it as a brand-new user B and adds that membership.
    user_b_id = str(
        await add_project_member(
            async_client, monkeypatch, project_id, Role.CONTRIBUTOR
        )
    )
    r = await async_client.post(url, json={})
    users = r.json()["users"]
    assert len(users) == 2  # both A and B present — this is what makes the
    # later len==1 assertion actually able to fail if expiry breaks.

    await asyncio.sleep(1.3)  # past presence_env's 1s test TTL

    r = await async_client.post(url, json={})  # still user B
    users = r.json()["users"]
    assert len(users) == 1
    assert users[0]["user_id"] == user_b_id
