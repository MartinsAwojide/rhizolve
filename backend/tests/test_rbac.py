"""US-19 permission matrix.

The story's own example tests (operator starting an investigation, viewer
submitting a Gemba result) target endpoints that don't exist in this
codebase yet (later epics). These tests instead exercise the real
project-scoped routes that exist today:
  - PATCH /{project_id}                          (Owner-only)
  - GET /{project_id}/members                    (any active member)
  - POST .../investigations/{id}/context          (Contributor+)
Same precedent as US-15/16's "given tests not literally reusable".
"""

import pytest

from models.project_member import Role

NON_OWNER_ROLES = [
    Role.ANALYST,
    Role.CONTRIBUTOR,
    Role.OPERATOR,
    Role.MANAGER,
    Role.VIEWER,
]

BELOW_CONTRIBUTOR_ROLES = [Role.OPERATOR, Role.MANAGER, Role.VIEWER]
CONTRIBUTOR_AND_ABOVE_ROLES = [Role.OWNER, Role.ANALYST, Role.CONTRIBUTOR]

ALL_GATED_ROUTES = [
    ("patch", "/api/v1/projects/{project_id}", {"name": "Renamed"}),
    ("get", "/api/v1/projects/{project_id}/members", None),
    (
        "post",
        "/api/v1/projects/{project_id}/members/internal",
        {"clerk_user_id": "clerk_target", "role": "analyst"},
    ),
    (
        "post",
        "/api/v1/projects/{project_id}/members/external",
        {"email": "ext@client.com", "role": "viewer"},
    ),
    ("post", "/api/v1/projects/{project_id}/invites/1/resend", None),
    (
        "post",
        "/api/v1/projects/{project_id}/investigations/inv-1/context",
        {"context": "should be blocked"},
    ),
]


async def _create_project(authed_client) -> str:
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


@pytest.mark.asyncio
@pytest.mark.parametrize("role", NON_OWNER_ROLES)
async def test_non_owner_cannot_update_project(
    authed_client, async_client, monkeypatch, add_project_member, role
):
    project_id = await _create_project(authed_client)
    await add_project_member(async_client, monkeypatch, project_id, role)

    r = await async_client.patch(
        f"/api/v1/projects/{project_id}", json={"name": "Renamed"}
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_update_project(authed_client):
    project_id = await _create_project(authed_client)

    r = await authed_client.patch(
        f"/api/v1/projects/{project_id}", json={"name": "Renamed"}
    )
    assert r.status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("role", CONTRIBUTOR_AND_ABOVE_ROLES + BELOW_CONTRIBUTOR_ROLES)
async def test_any_active_member_can_list_members(
    authed_client, async_client, monkeypatch, add_project_member, role
):
    project_id = await _create_project(authed_client)
    if role != Role.OWNER:
        await add_project_member(async_client, monkeypatch, project_id, role)
        r = await async_client.get(f"/api/v1/projects/{project_id}/members")
    else:
        r = await authed_client.get(f"/api/v1/projects/{project_id}/members")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_non_member_cannot_list_members(authed_client, async_client, monkeypatch):
    project_id = await _create_project(authed_client)

    async def _other_payload(request):
        return {"sub": "clerk_nonmember", "email": "nonmember@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer othertoken"
    await async_client.post("/api/v1/auth/sync")

    r = await async_client.get(f"/api/v1/projects/{project_id}/members")
    assert r.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("role", BELOW_CONTRIBUTOR_ROLES)
async def test_below_contributor_cannot_inject_context(
    authed_client, async_client, monkeypatch, add_project_member, role
):
    project_id = await _create_project(authed_client)
    await add_project_member(async_client, monkeypatch, project_id, role)

    r = await async_client.post(
        f"/api/v1/projects/{project_id}/investigations/inv-1/context",
        json={"context": "should be blocked"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_pending_owner_invite_cannot_update_project(
    authed_client, async_client, monkeypatch, add_project_member
):
    project_id = await _create_project(authed_client)
    await add_project_member(
        async_client, monkeypatch, project_id, Role.OWNER, status="pending"
    )

    r = await async_client.patch(
        f"/api/v1/projects/{project_id}", json={"name": "Renamed"}
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_pending_owner_invite_cannot_list_members(
    authed_client, async_client, monkeypatch, add_project_member
):
    project_id = await _create_project(authed_client)
    await add_project_member(
        async_client, monkeypatch, project_id, Role.OWNER, status="pending"
    )

    r = await async_client.get(f"/api/v1/projects/{project_id}/members")
    assert r.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path_template,body", ALL_GATED_ROUTES)
async def test_non_member_gets_403_on_every_gated_route(
    authed_client, async_client, monkeypatch, method, path_template, body
):
    project_id = await _create_project(authed_client)

    async def _other_payload(request):
        return {"sub": "clerk_nonmember2", "email": "nonmember2@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer othertoken2"
    await async_client.post("/api/v1/auth/sync")

    path = path_template.format(project_id=project_id)
    method_fn = getattr(async_client, method)
    r = await (method_fn(path, json=body) if body is not None else method_fn(path))
    assert r.status_code == 403
