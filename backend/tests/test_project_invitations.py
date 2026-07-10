from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select

from models.project_invitation import ProjectInvitation


@pytest.fixture(autouse=True)
def _no_real_email(monkeypatch):
    async def _internal_noop(to_email, project_name, role):
        return None

    sent_links = []

    async def _external_capture(to_email, project_name, role, invite_link):
        sent_links.append(invite_link)

    monkeypatch.setattr("api.project_members.send_invitation_email", _internal_noop)
    monkeypatch.setattr(
        "api.project_members.send_external_invitation_email", _external_capture
    )
    return sent_links


def _token_from_link(link: str) -> str:
    return parse_qs(urlparse(link).query)["token"][0]


@pytest.mark.asyncio
async def test_owner_can_invite_external_member(authed_client, _no_real_email):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["email"] == "ext@client.com"
    assert body["role"] == "viewer"
    assert body["status"] == "pending"
    assert "token" not in body
    assert len(_no_real_email) == 1


@pytest.mark.asyncio
async def test_external_cannot_be_owner(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "owner"},
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_external_cannot_be_analyst(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "analyst"},
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_invalid_email_returns_422(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "not-an-email", "role": "viewer"},
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_non_owner_cannot_invite_external(
    async_client, authed_client, monkeypatch
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    async def _other_payload(request):
        return {"sub": "clerk_other_user", "email": "other@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer othertoken"
    await async_client.post("/api/v1/auth/sync")

    r2 = await async_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    assert r2.status_code == 403


@pytest.mark.asyncio
async def test_get_invite_by_token(authed_client, _no_real_email):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    token = _token_from_link(_no_real_email[0])

    r2 = await authed_client.get(f"/api/v1/invites/{token}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["project_id"] == project_id
    assert body["role"] == "viewer"
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_unknown_token_returns_404(authed_client):
    r = await authed_client.get("/api/v1/invites/not-a-real-token")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_expired_token_returns_410(
    authed_client, db_session_factory, _no_real_email
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    token = _token_from_link(_no_real_email[0])

    async with db_session_factory() as session:
        result = await session.execute(
            select(ProjectInvitation).where(ProjectInvitation.token == token)
        )
        invite = result.scalar_one()
        invite.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        await session.commit()

    r2 = await authed_client.get(f"/api/v1/invites/{token}")
    assert r2.status_code == 410


@pytest.mark.asyncio
async def test_resend_issues_new_token_and_extends_expiry(
    authed_client, db_session_factory, _no_real_email
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    invitation_id = r2.json()["id"]
    old_token = _token_from_link(_no_real_email[0])

    r3 = await authed_client.post(
        f"/api/v1/projects/{project_id}/invites/{invitation_id}/resend"
    )
    assert r3.status_code == 200
    assert len(_no_real_email) == 2
    new_token = _token_from_link(_no_real_email[1])
    assert new_token != old_token

    r4 = await authed_client.get(f"/api/v1/invites/{old_token}")
    assert r4.status_code == 404

    r5 = await authed_client.get(f"/api/v1/invites/{new_token}")
    assert r5.status_code == 200


@pytest.mark.asyncio
async def test_non_owner_cannot_resend(
    async_client, authed_client, monkeypatch, _no_real_email
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    r2 = await authed_client.post(
        f"/api/v1/projects/{project_id}/members/external",
        json={"email": "ext@client.com", "role": "viewer"},
    )
    invitation_id = r2.json()["id"]

    async def _other_payload(request):
        return {"sub": "clerk_other_resend", "email": "other2@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer othertoken2"
    await async_client.post("/api/v1/auth/sync")

    r3 = await async_client.post(
        f"/api/v1/projects/{project_id}/invites/{invitation_id}/resend"
    )
    assert r3.status_code == 403
