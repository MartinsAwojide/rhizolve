import uuid

import pytest


@pytest.fixture(autouse=True)
def _no_real_email(monkeypatch):
    async def _noop(to_email, project_name, role):
        return None

    monkeypatch.setattr("api.project_members.send_invitation_email", _noop)


@pytest.mark.asyncio
async def test_owner_can_invite_internal_member(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    invitee_clerk_id = f"clerk_user_{uuid.uuid4()}"
    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/internal",
        json={"clerk_user_id": invitee_clerk_id, "role": "analyst"},
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["role"] == "analyst"
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_duplicate_invite_returns_409(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    invitee_clerk_id = f"clerk_user_{uuid.uuid4()}"
    payload = {"clerk_user_id": invitee_clerk_id, "role": "analyst"}
    r1 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/internal", json=payload
    )
    assert r1.status_code == 200

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/internal", json=payload
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_non_owner_cannot_invite(async_client, authed_client, monkeypatch):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    other_clerk_id = f"clerk_user_{uuid.uuid4()}"

    async def _other_payload(request):
        return {"sub": other_clerk_id, "email": f"{other_clerk_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer othertoken"
    await async_client.post("/api/v1/auth/sync")

    r2 = await async_client.post(
        f"/api/v1/projects/{project_id}/members/internal",
        json={"clerk_user_id": f"clerk_user_{uuid.uuid4()}", "role": "analyst"},
    )
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_accept_invite_activates_membership(
    authed_client, async_client, monkeypatch
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    invitee_clerk_id = f"clerk_user_{uuid.uuid4()}"
    await authed_client.post(
        f"/api/v1/projects/{project_id}/members/internal",
        json={"clerk_user_id": invitee_clerk_id, "role": "analyst"},
    )

    async def _invitee_payload(request):
        return {"sub": invitee_clerk_id, "email": f"{invitee_clerk_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _invitee_payload)
    async_client.headers["Authorization"] = "Bearer invitee-token"
    await async_client.post("/api/v1/auth/sync")

    r2 = await async_client.post(f"/api/v1/projects/{project_id}/members/accept")
    assert r2.status_code == 200
    assert r2.json()["status"] == "active"
