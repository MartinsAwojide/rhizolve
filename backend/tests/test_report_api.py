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


async def _pinned_root_cause_validator(state):
    active = state.get("active_hypothesis")
    why_node = next(
        n for n in state["why_nodes"] if n["branch_path"] == active["branch_path"]
    )
    return {
        "why_nodes": [{**why_node, "is_root_cause": True}],
        "current_depth": why_node["depth"],
        "current_branch_path": why_node["branch_path"],
    }


@pytest.fixture
async def report_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    monkeypatch.setattr(
        "agent.graph.root_cause_validator", _pinned_root_cause_validator
    )
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
async def test_get_report_returns_phenomenon_and_root_cause_for_org_member(
    authed_client, report_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(report_env, project_id)
    await authed_client.post(
        f"{_base(project_id, investigation_id)}/gemba",
        data={"result": "NOK", "notes": "seal cracked"},
    )

    r = await authed_client.get(f"{_base(project_id, investigation_id)}/report")

    assert r.status_code == 200
    body = r.json()
    assert body["phenomenon"] == "Glue overflowed"
    assert body["domain"] == "manufacturing"
    assert body["root_cause"] == "seal wear on the fill valve"
    assert len(body["why_nodes"]) == 1


@pytest.mark.asyncio
async def test_get_report_non_member_gets_403(
    authed_client, async_client, monkeypatch, report_env
):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(report_env, project_id)

    async def _other_user_payload(request):
        return {"sub": "clerk_user_outsider", "email": "outsider@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_user_payload)
    async_client.headers["Authorization"] = "Bearer outsider-token"
    await async_client.post("/api/v1/auth/sync")

    r = await async_client.get(f"{_base(project_id, investigation_id)}/report")

    assert r.status_code == 403
