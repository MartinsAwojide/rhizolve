import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.presence import PresenceTracker
from core.pubsub import RedisPubSub
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
async def advance_env(monkeypatch):
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


ADVANCE_ROUTES = [
    ("hypothesis-review", {}),
    ("validator-review", {"user_override_root_cause": False}),
    ("countermeasure-review", {"accepted": False, "feedback": "retry"}),
]


@pytest.mark.asyncio
async def test_validator_review_driver_with_quorum_returns_200(
    authed_client, advance_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(advance_env, project_id)
    base = _base(project_id, investigation_id)

    # Solo participant: driver by default and always at quorum.
    await authed_client.post(f"{base}/presence/heartbeat", json={})

    r = await authed_client.post(
        f"{base}/validator-review", json={"user_override_root_cause": False}
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_hypothesis_review_driver_with_quorum_returns_200(
    authed_client, advance_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(advance_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(f"{base}/presence/heartbeat", json={})

    r = await authed_client.post(f"{base}/hypothesis-review", json={})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_countermeasure_review_driver_with_quorum_returns_200(
    authed_client, advance_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(advance_env, project_id)
    base = _base(project_id, investigation_id)

    await authed_client.post(f"{base}/presence/heartbeat", json={})
    await advance_env.submit_gemba(investigation_id, result="NOK", notes="cracked")
    await advance_env.submit_validator_review(
        investigation_id, user_override_root_cause=True
    )

    r = await authed_client.post(
        f"{base}/countermeasure-review", json={"accepted": False, "feedback": "retry"}
    )
    assert r.status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("route,body", ADVANCE_ROUTES)
async def test_advance_route_non_driver_gets_403(
    route,
    body,
    authed_client,
    async_client,
    monkeypatch,
    add_project_member,
    advance_env,
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(advance_env, project_id)
    base = _base(project_id, investigation_id)

    # authed_client (owner) heartbeats and becomes driver.
    await authed_client.post(f"{base}/presence/heartbeat", json={})

    # A second member never heartbeats, so is not the driver.
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)
    r = await async_client.post(f"{base}/{route}", json=body)
    assert r.status_code == 403
    assert "driver" in r.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.parametrize("route,body", ADVANCE_ROUTES)
async def test_advance_route_driver_without_quorum_gets_403(
    route,
    body,
    authed_client,
    async_client,
    monkeypatch,
    add_project_member,
    advance_env,
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(advance_env, project_id)
    base = _base(project_id, investigation_id)

    # Owner heartbeats first, becomes driver.
    await authed_client.post(f"{base}/presence/heartbeat", json={})
    # Two more steering-eligible members join and heartbeat — 3 active
    # steering-eligible participants total, quorum requires 2 ready.
    await add_project_member(async_client, monkeypatch, project_id, Role.ANALYST)
    await async_client.post(f"{base}/presence/heartbeat", json={})
    await add_project_member(async_client, monkeypatch, project_id, Role.CONTRIBUTOR)
    await async_client.post(f"{base}/presence/heartbeat", json={})

    # Nobody has readied — quorum not reached. Driver (owner) tries to
    # advance; must be re-authenticated back to owner to make the call.
    owner_clerk_user_id = authed_client.current_user["clerk_user_id"]

    async def _owner_payload(request):
        return {"sub": owner_clerk_user_id, "email": f"{owner_clerk_user_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _owner_payload)
    authed_client.headers["Authorization"] = f"Bearer {owner_clerk_user_id}"
    await authed_client.post("/api/v1/auth/sync")

    r = await authed_client.post(f"{base}/{route}", json=body)
    assert r.status_code == 403
    assert "quorum" in r.json()["detail"].lower()
