import uuid

import pytest

from api.main import app
from models.organisation import Organisation


@pytest.mark.asyncio
async def test_creator_is_owner(authed_client, current_user):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    assert r.status_code == 200
    project_id = r.json()["id"]

    members = (await authed_client.get(f"/api/v1/projects/{project_id}/members")).json()
    assert any(
        m["user_id"] == current_user["id"] and m["role"] == "owner" for m in members
    )


@pytest.mark.asyncio
async def test_maturity_inherits_from_org(async_client, monkeypatch):
    clerk_org_id = f"clerk_org_{uuid.uuid4()}"
    clerk_user_id = f"clerk_user_{uuid.uuid4()}"

    async with app.state.db_sessionmaker() as session:
        session.add(
            Organisation(clerk_org_id=clerk_org_id, name="acme", maturity_level=3)
        )
        await session.commit()

    async def _payload(request):
        return {
            "sub": clerk_user_id,
            "email": f"{clerk_user_id}@test.com",
            "org_id": clerk_org_id,
        }

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    async_client.headers["Authorization"] = "Bearer testtoken"
    await async_client.post("/api/v1/auth/sync")

    r = await async_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    assert r.status_code == 200
    assert r.json()["maturity_level"] == 3


@pytest.mark.asyncio
async def test_missing_name_returns_422(authed_client):
    r = await authed_client.post("/api/v1/projects", json={"visibility": "private"})
    assert r.status_code == 422
