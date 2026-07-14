import asyncio

import pytest
from sqlalchemy import select

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub, make_channel
from core.ready import ReadyTracker
from models.conflict import Conflict, ConflictStatus
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
async def conflict_env(monkeypatch):
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


def _base(project_id: str, investigation_id: str) -> str:
    return f"/api/v1/projects/{project_id}/investigations/{investigation_id}"


async def _close_root_h1_then_rewind_active(agent, investigation_id: str) -> None:
    config = await agent._config(investigation_id)
    closed_node = next(
        n
        for n in (await agent.graph.aget_state(config)).values["why_nodes"]
        if n["branch_path"] == "root.h1"
    )
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


@pytest.mark.asyncio
async def test_gemba_sync_flags_conflict_and_stores_audit_row(
    authed_client, conflict_env, db_session_factory
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(conflict_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(
        f"{base}/gemba", data={"result": "NOK", "notes": "seal cracked"}
    )
    await _close_root_h1_then_rewind_active(conflict_env, investigation_id)

    r = await authed_client.post(
        f"{base}/gemba", data={"result": "OK", "notes": "synced from device"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["conflict"] is True
    assert body["branch_path"] == "root.h1"
    assert "conflict_id" in body

    async with db_session_factory() as session:
        rows = (
            (
                await session.execute(
                    select(Conflict).where(
                        Conflict.investigation_id == investigation_id
                    )
                )
            )
            .scalars()
            .all()
        )
    assert len(rows) == 1
    assert rows[0].status == ConflictStatus.FLAGGED
    assert rows[0].existing_result == "NOK"
    assert rows[0].incoming_result == "OK"


@pytest.mark.asyncio
async def test_conflict_flagged_published_on_conflicting_sync(
    authed_client, conflict_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(conflict_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(f"{base}/gemba", data={"result": "NOK", "notes": ""})
    await _close_root_h1_then_rewind_active(conflict_env, investigation_id)

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    async def listen():
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "conflict_flagged":
                    return event

    listener = asyncio.create_task(listen())
    await asyncio.sleep(0.1)

    await authed_client.post(f"{base}/gemba", data={"result": "OK", "notes": ""})

    event = await listener
    assert event["payload"]["branch_path"] == "root.h1"


@pytest.mark.asyncio
async def test_resolve_conflict_accept_marks_resolved(
    authed_client, conflict_env, db_session_factory
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(conflict_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(f"{base}/presence/heartbeat", json={})
    await authed_client.post(f"{base}/gemba", data={"result": "NOK", "notes": ""})
    await _close_root_h1_then_rewind_active(conflict_env, investigation_id)
    r = await authed_client.post(f"{base}/gemba", data={"result": "OK", "notes": ""})
    conflict_id = r.json()["conflict_id"]

    r2 = await authed_client.post(
        f"{base}/conflicts/{conflict_id}/resolve", json={"action": "accept"}
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "resolved"

    async with db_session_factory() as session:
        row = await session.get(Conflict, conflict_id)
        assert row.status == ConflictStatus.RESOLVED
        assert row.resolution.value == "accept"


@pytest.mark.asyncio
async def test_resolve_conflict_reset_calls_agent_reset_tree(
    authed_client, conflict_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(conflict_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(f"{base}/presence/heartbeat", json={})
    await authed_client.post(f"{base}/gemba", data={"result": "NOK", "notes": ""})
    await _close_root_h1_then_rewind_active(conflict_env, investigation_id)
    r = await authed_client.post(f"{base}/gemba", data={"result": "OK", "notes": ""})
    conflict_id = r.json()["conflict_id"]

    r2 = await authed_client.post(
        f"{base}/conflicts/{conflict_id}/resolve",
        json={"action": "reset", "reset_type": "soft"},
    )
    assert r2.status_code == 200

    config = await conflict_env._config(investigation_id)
    snapshot = await conflict_env.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "suspended"


@pytest.mark.asyncio
async def test_resolve_conflict_non_driver_gets_403(
    authed_client, async_client, monkeypatch, add_project_member, conflict_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(conflict_env, project_id)
    base = _base(project_id, investigation_id)

    # Owner heartbeats first, becomes driver.
    await authed_client.post(f"{base}/presence/heartbeat", json={})
    await authed_client.post(f"{base}/gemba", data={"result": "NOK", "notes": ""})
    await _close_root_h1_then_rewind_active(conflict_env, investigation_id)
    r = await authed_client.post(f"{base}/gemba", data={"result": "OK", "notes": ""})
    conflict_id = r.json()["conflict_id"]

    await add_project_member(async_client, monkeypatch, project_id, Role.ANALYST)
    r2 = await async_client.post(
        f"{base}/conflicts/{conflict_id}/resolve", json={"action": "accept"}
    )
    assert r2.status_code == 403
