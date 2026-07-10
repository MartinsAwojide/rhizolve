"""US-19a membership scope matrix.

Only context injection exists as a real context-bearing endpoint today —
RAG search, external integration context, audit log, and report export
(the rest of T03's target list) are later epics (E08/E09/E11) and are not
tested here since the routes don't exist. Same precedent as test_rbac.py.

Org affiliation is driven through the mocked Clerk JWT's org_id/org_slug
claims (same as test_organisations.py), not by writing User.org_id directly
via db_session_factory — get_current_user re-upserts org_id from the
payload on every authenticated request, so a direct DB write is silently
overwritten by the next call. This is real, existing behavior, not a test
artifact.
"""

import uuid

import pytest

from agent.five_whys_agent import FiveWhysAgent
from agent.serializers import serialize_why_tree
from api.main import app
from core.memory import make_checkpointer
from models.project_member import MembershipScope, Role

SAMPLE_NODES = [
    {
        "id": "n1",
        "branch_path": "1",
        "depth": 0,
        "hypothesis": "seal wear",
        "gemba_result": "NOK",
        "gemba_notes": "internal notes about the fill valve",
        "is_root_cause": False,
        "countermeasure": "replace seal",
        "status": "active",
    }
]


async def _give_owner_org(authed_client, monkeypatch, clerk_org_id: str) -> None:
    clerk_user_id = authed_client.current_user["clerk_user_id"]

    async def _payload(request):
        return {
            "sub": clerk_user_id,
            "email": f"{clerk_user_id}@test.com",
            "org_id": clerk_org_id,
            "org_slug": clerk_org_id,
        }

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    r = await authed_client.post("/api/v1/auth/sync")
    authed_client.current_user = r.json()


async def _create_project(authed_client) -> str:
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


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
async def test_external_contributor_cannot_inject_context(
    authed_client, async_client, monkeypatch, add_project_member
):
    await _give_owner_org(authed_client, monkeypatch, f"clerk_org_{uuid.uuid4()}")
    project_id = await _create_project(authed_client)

    await add_project_member(
        async_client,
        monkeypatch,
        project_id,
        Role.CONTRIBUTOR,
        clerk_org_id=f"clerk_org_{uuid.uuid4()}",
    )

    r = await async_client.post(
        f"/api/v1/projects/{project_id}/investigations/inv-1/context",
        json={"context": "should be blocked"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "External members cannot access this resource"


@pytest.mark.asyncio
async def test_internal_contributor_can_inject_context(
    authed_client, async_client, monkeypatch, add_project_member
):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    agent = FiveWhysAgent(checkpointer)
    app.state.five_whys_agent = agent
    try:
        shared_org = f"clerk_org_{uuid.uuid4()}"
        await _give_owner_org(authed_client, monkeypatch, shared_org)
        project_id = await _create_project(authed_client)

        await add_project_member(
            async_client,
            monkeypatch,
            project_id,
            Role.CONTRIBUTOR,
            clerk_org_id=shared_org,
        )

        started = await agent.start_investigation(
            phenomenon="Glue overflowed",
            domain="manufacturing",
            system_or_process_context="glue tank fill station, line 3",
            project_id=project_id,
        )
        investigation_id = started["investigation_id"]

        r = await async_client.post(
            f"/api/v1/projects/{project_id}/investigations/{investigation_id}/context",
            json={"context": "fine"},
        )
        assert r.status_code == 200

        config = {"configurable": {"thread_id": f"{project_id}:{investigation_id}"}}
        snapshot = await agent.graph.aget_state(config)
        assert "fine" in snapshot.values["domain_context"]
    finally:
        app.state.five_whys_agent = original_agent
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_scope_is_computed_fresh_not_cached(
    authed_client, async_client, monkeypatch, add_project_member
):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    agent = FiveWhysAgent(checkpointer)
    app.state.five_whys_agent = agent
    try:
        org_a = f"clerk_org_{uuid.uuid4()}"
        org_b = f"clerk_org_{uuid.uuid4()}"

        await _give_owner_org(authed_client, monkeypatch, org_a)
        project_id = await _create_project(authed_client)

        await add_project_member(
            async_client, monkeypatch, project_id, Role.CONTRIBUTOR, clerk_org_id=org_a
        )
        contributor_clerk_id = async_client.headers["Authorization"].removeprefix(
            "Bearer "
        )

        started = await agent.start_investigation(
            phenomenon="Glue overflowed",
            domain="manufacturing",
            system_or_process_context="glue tank fill station, line 3",
            project_id=project_id,
        )
        investigation_id = started["investigation_id"]

        r1 = await async_client.post(
            f"/api/v1/projects/{project_id}/investigations/{investigation_id}/context",
            json={"context": "call 1, still internal"},
        )
        assert r1.status_code == 200

        async def _contributor_payload_b(request):
            return {
                "sub": contributor_clerk_id,
                "email": f"{contributor_clerk_id}@test.com",
                "org_id": org_b,
                "org_slug": org_b,
            }

        monkeypatch.setattr("core.auth.verify_clerk_token", _contributor_payload_b)
        await async_client.post("/api/v1/auth/sync")

        r2 = await async_client.post(
            f"/api/v1/projects/{project_id}/investigations/{investigation_id}/context",
            json={"context": "call 2, now external"},
        )
        assert r2.status_code == 403
        assert r2.json()["detail"] == "External members cannot access this resource"
    finally:
        app.state.five_whys_agent = original_agent
        await ctx.__aexit__(None, None, None)


def test_serialize_why_tree_internal_keeps_full_detail():
    result = serialize_why_tree(SAMPLE_NODES, MembershipScope.INTERNAL)
    assert result["nodes"][0]["gemba_notes"] == "internal notes about the fill valve"
    assert result["nodes"][0]["countermeasure"] == "replace seal"


def test_serialize_why_tree_external_strips_detail_keeps_structure():
    result = serialize_why_tree(SAMPLE_NODES, MembershipScope.EXTERNAL)
    node = result["nodes"][0]
    assert "gemba_notes" not in node
    assert "countermeasure" not in node
    assert "is_root_cause" not in node
    assert node["id"] == "n1"
    assert node["branch_path"] == "1"
    assert node["hypothesis"] == "seal wear"
    assert node["gemba_result"] == "NOK"
    assert node["status"] == "active"
