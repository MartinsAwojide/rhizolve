import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer
from core.pubsub import RedisPubSub


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
async def status_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    pubsub = RedisPubSub(app.state.redis)
    agent = FiveWhysAgent(checkpointer, pubsub=pubsub)
    app.state.five_whys_agent = agent
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
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


@pytest.mark.asyncio
async def test_status_returns_pending_hypotheses_on_hypothesis_review(
    authed_client, status_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(status_env, project_id)

    r = await authed_client.get(f"{_base(project_id, investigation_id)}/status")

    assert r.status_code == 200
    body = r.json()
    assert body["interrupt_type"] == "hypothesis_review"
    assert body["pending_hypotheses"][0]["hypothesis"] == "seal wear on the fill valve"
    assert body["node"] is None


@pytest.mark.asyncio
async def test_status_returns_node_on_validator_review(authed_client, status_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(status_env, project_id)
    await authed_client.post(
        f"{_base(project_id, investigation_id)}/gemba",
        data={"result": "NOK", "notes": "seal cracked"},
    )

    r = await authed_client.get(f"{_base(project_id, investigation_id)}/status")

    assert r.status_code == 200
    body = r.json()
    assert body["interrupt_type"] == "validator_review"
    assert body["node"]["branch_path"] == "root.h1"
    assert body["pending_hypotheses"] == []


@pytest.mark.asyncio
async def test_status_non_member_gets_403(
    authed_client, async_client, monkeypatch, status_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(status_env, project_id)

    async def _other_user_payload(request):
        return {"sub": "clerk_user_outsider", "email": "outsider@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_user_payload)
    async_client.headers["Authorization"] = "Bearer outsider-token"
    await async_client.post("/api/v1/auth/sync")

    r = await async_client.get(f"{_base(project_id, investigation_id)}/status")

    assert r.status_code == 403
