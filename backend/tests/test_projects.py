import uuid

import pytest

from api.main import app
from models.investigation import Investigation, InvestigationStatus
from models.organisation import Organisation
from models.project_member import Role


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


@pytest.mark.asyncio
async def test_description_persists_and_defaults_to_none(authed_client):
    r = await authed_client.post(
        "/api/v1/projects",
        json={
            "name": "Test",
            "visibility": "private",
            "description": "glue line investigations",
        },
    )
    assert r.status_code == 200
    assert r.json()["description"] == "glue line investigations"

    r2 = await authed_client.post(
        "/api/v1/projects", json={"name": "No description", "visibility": "private"}
    )
    assert r2.status_code == 200
    assert r2.json()["description"] is None


@pytest.mark.asyncio
async def test_project_status_is_draft_with_no_investigations(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    body = r.json()
    assert body["status"] == "draft"
    assert body["active_investigation_count"] == 0
    assert body["member_count"] == 1


@pytest.mark.asyncio
async def test_project_status_is_active_with_pending_investigation(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    async with app.state.db_sessionmaker() as session:
        session.add(
            Investigation(
                id=f"inv-{uuid.uuid4()}",
                project_id=project_id,
                status=InvestigationStatus.AWAITING_GEMBA,
            )
        )
        await session.commit()

    r2 = await authed_client.get("/api/v1/projects")
    project = next(p for p in r2.json() if p["id"] == project_id)
    assert project["status"] == "active"
    assert project["active_investigation_count"] == 1


@pytest.mark.asyncio
async def test_active_investigation_id_is_null_with_no_investigations(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    assert r.json()["active_investigation_id"] is None


@pytest.mark.asyncio
async def test_active_investigation_id_matches_non_complete_investigation(
    authed_client,
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]
    investigation_id = f"inv-{uuid.uuid4()}"

    async with app.state.db_sessionmaker() as session:
        session.add(
            Investigation(
                id=investigation_id,
                project_id=project_id,
                status=InvestigationStatus.AWAITING_GEMBA,
            )
        )
        await session.commit()

    r2 = await authed_client.get("/api/v1/projects")
    project = next(p for p in r2.json() if p["id"] == project_id)
    assert project["active_investigation_id"] == investigation_id


@pytest.mark.asyncio
async def test_active_investigation_id_is_null_when_all_complete(authed_client):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    async with app.state.db_sessionmaker() as session:
        session.add(
            Investigation(
                id=f"inv-{uuid.uuid4()}",
                project_id=project_id,
                status=InvestigationStatus.COMPLETE,
            )
        )
        await session.commit()

    r2 = await authed_client.get("/api/v1/projects")
    project = next(p for p in r2.json() if p["id"] == project_id)
    assert project["active_investigation_id"] is None


@pytest.mark.asyncio
async def test_project_status_is_closed_when_all_investigations_complete(
    authed_client,
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    async with app.state.db_sessionmaker() as session:
        session.add(
            Investigation(
                id=f"inv-{uuid.uuid4()}",
                project_id=project_id,
                status=InvestigationStatus.COMPLETE,
            )
        )
        await session.commit()

    r2 = await authed_client.get("/api/v1/projects")
    project = next(p for p in r2.json() if p["id"] == project_id)
    assert project["status"] == "closed"
    assert project["active_investigation_count"] == 0


@pytest.mark.asyncio
async def test_project_member_count_reflects_all_members(
    authed_client, async_client, monkeypatch, add_project_member
):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]

    await add_project_member(async_client, monkeypatch, project_id, Role.ANALYST)

    r2 = await authed_client.get("/api/v1/projects")
    project = next(p for p in r2.json() if p["id"] == project_id)
    assert project["member_count"] == 2
