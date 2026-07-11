import asyncio

import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub, make_channel
from core.ready import ReadyTracker
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
async def quorum_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    original_presence = app.state.presence
    original_ready = app.state.ready
    pubsub = RedisPubSub(app.state.redis)
    agent = FiveWhysAgent(checkpointer, pubsub=pubsub)
    app.state.five_whys_agent = agent
    app.state.presence = PresenceTracker(app.state.redis, ttl_seconds=8)
    app.state.ready = ReadyTracker(app.state.redis)
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
        app.state.presence = original_presence
        app.state.ready = original_ready
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


def _urls(project_id: str, investigation_id: str) -> tuple[str, str]:
    base = f"/api/v1/projects/{project_id}/investigations/{investigation_id}"
    return f"{base}/presence/heartbeat", f"{base}/ready"


@pytest.mark.asyncio
async def test_ready_toggle_returns_state_and_quorum(authed_client, quorum_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(quorum_env, project_id)
    heartbeat_url, ready_url = _urls(project_id, investigation_id)

    await authed_client.post(heartbeat_url, json={})
    r = await authed_client.post(ready_url)
    assert r.status_code == 200
    body = r.json()
    assert body["ready"] is True
    # Solo participant is always at quorum per AC.
    assert body["quorum"] is True


@pytest.mark.asyncio
async def test_quorum_reached_published_on_crossing_threshold(
    authed_client, async_client, monkeypatch, add_project_member, quorum_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(quorum_env, project_id)
    heartbeat_url, ready_url = _urls(project_id, investigation_id)

    owner_clerk_user_id = authed_client.current_user["clerk_user_id"]

    # Three steering-eligible participants heartbeat: owner (current
    # identity), analyst, contributor.
    await authed_client.post(heartbeat_url, json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.ANALYST)
    await async_client.post(heartbeat_url, json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)
    await async_client.post(heartbeat_url, json={})

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    async def listen():
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "quorum_reached":
                    return event

    listener = asyncio.create_task(listen())
    await asyncio.sleep(0.1)

    # Contributor (current identity) readies first — 1 of 3, not yet quorum.
    r = await async_client.post(ready_url)
    assert r.json()["quorum"] is False

    # Re-authenticate back to owner and ready — 2 of 3, crosses threshold.
    async def _owner_payload(request):
        return {"sub": owner_clerk_user_id, "email": f"{owner_clerk_user_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _owner_payload)
    authed_client.headers["Authorization"] = f"Bearer {owner_clerk_user_id}"
    await authed_client.post("/api/v1/auth/sync")
    r = await authed_client.post(ready_url)
    assert r.json()["quorum"] is True

    event = await listener
    assert event["type"] == "quorum_reached"


@pytest.mark.asyncio
async def test_quorum_lost_published_when_ready_participant_unreadies(
    authed_client, async_client, monkeypatch, add_project_member, quorum_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(quorum_env, project_id)
    heartbeat_url, ready_url = _urls(project_id, investigation_id)

    owner_clerk_user_id = authed_client.current_user["clerk_user_id"]

    await authed_client.post(heartbeat_url, json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.ANALYST)
    await async_client.post(heartbeat_url, json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)
    await async_client.post(heartbeat_url, json={})

    # Contributor and owner both ready — crosses quorum (2 of 3).
    await async_client.post(ready_url)

    async def _owner_payload(request):
        return {"sub": owner_clerk_user_id, "email": f"{owner_clerk_user_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _owner_payload)
    authed_client.headers["Authorization"] = f"Bearer {owner_clerk_user_id}"
    await authed_client.post("/api/v1/auth/sync")
    r = await authed_client.post(ready_url)
    assert r.json()["quorum"] is True

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    async def listen():
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "quorum_lost":
                    return event

    listener = asyncio.create_task(listen())
    await asyncio.sleep(0.1)

    # Owner un-readies — drops back to 1 of 3, below threshold.
    r = await authed_client.post(ready_url)
    assert r.json()["quorum"] is False

    event = await listener
    assert event["type"] == "quorum_lost"


@pytest.mark.asyncio
async def test_no_publish_when_toggle_does_not_change_quorum_state(
    authed_client, quorum_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(quorum_env, project_id)
    heartbeat_url, ready_url = _urls(project_id, investigation_id)

    await authed_client.post(heartbeat_url, json={})

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    events = []

    async def collect():
        async with asyncio.timeout(0.5):
            async for event in gen:
                events.append(event)

    collector = asyncio.create_task(collect())
    await asyncio.sleep(0.1)

    # Solo participant: quorum is already True before AND after the toggle
    # (both states are "at quorum" per the solo-always-quorum AC), so no
    # quorum_reached/quorum_lost transition event should fire.
    await authed_client.post(ready_url)

    try:
        await collector
    except asyncio.TimeoutError:
        pass

    assert not any(e["type"] in ("quorum_reached", "quorum_lost") for e in events)
