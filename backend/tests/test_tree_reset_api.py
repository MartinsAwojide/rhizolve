import asyncio

import pytest
from sqlalchemy import select

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub, make_channel
from models.audit_log import AuditLog
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
async def reset_env(monkeypatch):
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


def _urls(project_id: str, investigation_id: str) -> tuple[str, str]:
    base = f"/api/v1/projects/{project_id}/investigations/{investigation_id}"
    return f"{base}/presence/heartbeat", f"{base}/tree/reset"


@pytest.mark.asyncio
async def test_driver_can_soft_reset_and_audit_row_created(
    authed_client, reset_env, db_session_factory
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(reset_env, project_id)
    heartbeat_url, reset_url = _urls(project_id, investigation_id)

    await reset_env.submit_gemba(investigation_id, result="NOK", notes="cracked")
    await authed_client.post(heartbeat_url, json={})
    r = await authed_client.post(
        reset_url,
        json={
            "branch_path": "root.h1",
            "reset_type": "soft",
            "evidence_reference": "photo-1",
        },
    )
    assert r.status_code == 200

    async with db_session_factory() as session:
        result = await session.execute(
            select(AuditLog).where(AuditLog.investigation_id == investigation_id)
        )
        row = result.scalar_one()
        assert row.reset_type.value == "soft"
        assert row.branch_path == "root.h1"
        assert row.evidence_reference == "photo-1"

    config = reset_env._config(investigation_id)
    snapshot = await reset_env.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "suspended"


@pytest.mark.asyncio
async def test_driver_can_hard_reset(authed_client, reset_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(reset_env, project_id)
    heartbeat_url, reset_url = _urls(project_id, investigation_id)

    # start_investigation only queues "root.h1" as a pending hypothesis;
    # submit_gemba dispatches it into a real WhyNode entry, which hard
    # reset needs to actually operate on.
    await reset_env.submit_gemba(investigation_id, result="NOK", notes="cracked")
    await authed_client.post(heartbeat_url, json={})
    r = await authed_client.post(
        reset_url, json={"branch_path": "root.h1", "reset_type": "hard"}
    )
    assert r.status_code == 200

    config = reset_env._config(investigation_id)
    snapshot = await reset_env.graph.aget_state(config)
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "deleted"


@pytest.mark.asyncio
async def test_non_driver_gets_403_on_reset(
    authed_client,
    async_client,
    monkeypatch,
    add_project_member,
    reset_env,
    db_session_factory,
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(reset_env, project_id)
    heartbeat_url, reset_url = _urls(project_id, investigation_id)

    await authed_client.post(heartbeat_url, json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)

    r = await async_client.post(
        reset_url, json={"branch_path": "root.h1", "reset_type": "soft"}
    )
    assert r.status_code == 403

    async with db_session_factory() as session:
        result = await session.execute(
            select(AuditLog).where(AuditLog.investigation_id == investigation_id)
        )
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_reset_publishes_tree_reset_event(authed_client, reset_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(reset_env, project_id)
    heartbeat_url, reset_url = _urls(project_id, investigation_id)

    await reset_env.submit_gemba(investigation_id, result="NOK", notes="cracked")
    await authed_client.post(heartbeat_url, json={})

    pubsub = RedisPubSub(app.state.redis)
    channel = make_channel(project_id, investigation_id)
    gen = pubsub.subscribe(channel)

    async def listen():
        async with asyncio.timeout(3.0):
            async for event in gen:
                if event["type"] == "tree_reset":
                    return event

    listener = asyncio.create_task(listen())
    await asyncio.sleep(0.1)

    r = await authed_client.post(
        reset_url, json={"branch_path": "root.h1", "reset_type": "soft"}
    )
    assert r.status_code == 200

    event = await listener
    assert event["payload"]["branch_path"] == "root.h1"
    assert event["payload"]["reset_type"] == "soft"


@pytest.mark.asyncio
async def test_reset_moves_current_branch_path(authed_client, reset_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(reset_env, project_id)
    heartbeat_url, reset_url = _urls(project_id, investigation_id)

    await reset_env.submit_gemba(investigation_id, result="NOK", notes="cracked")
    await authed_client.post(heartbeat_url, json={})
    r = await authed_client.post(
        reset_url, json={"branch_path": "root.h1", "reset_type": "soft"}
    )
    assert r.status_code == 200

    config = reset_env._config(investigation_id)
    snapshot = await reset_env.graph.aget_state(config)
    assert snapshot.values["current_branch_path"] == "root.h1"
    node = next(
        n for n in snapshot.values["why_nodes"] if n["branch_path"] == "root.h1"
    )
    assert node["status"] == "suspended"
