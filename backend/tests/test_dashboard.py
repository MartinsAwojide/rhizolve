import uuid

import pytest

from models.conflict import Conflict, ConflictResolution, ConflictStatus
from models.investigation import Investigation, InvestigationStatus


@pytest.fixture
async def authed_external_viewer(async_client, monkeypatch):
    """A user who never synced a Clerk `org_id` claim -- has no home org."""
    clerk_user_id = f"clerk_user_{uuid.uuid4()}"

    async def _payload(request):
        return {"sub": clerk_user_id, "email": f"{clerk_user_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    async_client.headers["Authorization"] = "Bearer testtoken"
    r = await async_client.post("/api/v1/auth/sync")
    assert r.status_code == 200
    async_client.current_user = r.json()
    yield async_client


async def _create_project(client) -> str:
    r = await client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


async def _seed_investigation(
    db_session_factory,
    *,
    investigation_id: str,
    project_id: str,
    status: InvestigationStatus = InvestigationStatus.AWAITING_GEMBA,
    interrupt_type: str | None = "gemba_result_review",
    current_depth: int = 1,
    root_cause_found: bool = False,
    node_count: int = 2,
    node_pending_count: int = 1,
    awaiting_quorum: bool = False,
) -> None:
    async with db_session_factory() as session:
        session.add(
            Investigation(
                id=investigation_id,
                project_id=project_id,
                status=status,
                interrupt_type=interrupt_type,
                current_depth=current_depth,
                root_cause_found=root_cause_found,
                node_count=node_count,
                node_pending_count=node_pending_count,
                awaiting_quorum=awaiting_quorum,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_dashboard_metrics_denied_for_external_member(authed_external_viewer):
    r = await authed_external_viewer.get("/api/v1/dashboard/metrics")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_metrics_returns_org_scoped_counts(
    authed_client, async_client, monkeypatch, add_project_member, db_session_factory
):
    clerk_org_id = f"clerk_org_{uuid.uuid4()}"

    async def _owner_payload(request):
        return {
            "sub": authed_client.current_user["clerk_user_id"],
            "email": f"{authed_client.current_user['clerk_user_id']}@test.com",
            "org_id": clerk_org_id,
            "org_slug": clerk_org_id,
        }

    monkeypatch.setattr("core.auth.verify_clerk_token", _owner_payload)
    r = await authed_client.post("/api/v1/auth/sync")
    authed_client.current_user = r.json()

    project_id = await _create_project(authed_client)

    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        status=InvestigationStatus.AWAITING_GEMBA,
        root_cause_found=False,
    )
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        status=InvestigationStatus.COMPLETE,
        root_cause_found=True,
        current_depth=3,
    )

    # A different org's investigation must not leak into these counts.
    other_project_id = str(uuid.uuid4())
    async with db_session_factory() as session:
        from models.project import Project, Visibility

        session.add(
            Project(
                id=other_project_id,
                name="Other org",
                visibility=Visibility.PRIVATE,
                owner_id=authed_client.current_user["id"],
                org_id=None,
            )
        )
        await session.commit()
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=other_project_id,
        status=InvestigationStatus.AWAITING_GEMBA,
    )

    r = await authed_client.get("/api/v1/dashboard/metrics")
    assert r.status_code == 200
    body = r.json()
    assert body["active_investigations"] == 1
    assert body["root_causes_found"] == 1
    assert body["average_depth_to_cause"] == 3.0


@pytest.mark.asyncio
async def test_dashboard_metrics_gemba_completion_rate_formula(
    authed_client, monkeypatch, db_session_factory
):
    clerk_org_id = f"clerk_org_{uuid.uuid4()}"

    async def _owner_payload(request):
        return {
            "sub": authed_client.current_user["clerk_user_id"],
            "email": f"{authed_client.current_user['clerk_user_id']}@test.com",
            "org_id": clerk_org_id,
            "org_slug": clerk_org_id,
        }

    monkeypatch.setattr("core.auth.verify_clerk_token", _owner_payload)
    r = await authed_client.post("/api/v1/auth/sync")
    authed_client.current_user = r.json()

    project_id = await _create_project(authed_client)
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        node_count=4,
        node_pending_count=1,
    )
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        node_count=6,
        node_pending_count=1,
    )

    r = await authed_client.get("/api/v1/dashboard/metrics")
    assert r.status_code == 200
    # (4 + 6 - 1 - 1) / (4 + 6) = 0.8
    assert r.json()["gemba_completion_rate"] == pytest.approx(0.8)


@pytest.mark.asyncio
async def test_dashboard_attention_returns_flagged_conflicts_for_users_projects(
    authed_client, db_session_factory
):
    project_id = await _create_project(authed_client)
    async with db_session_factory() as session:
        session.add(
            Conflict(
                project_id=project_id,
                investigation_id="inv-1",
                branch_path="1.1",
                existing_result="NOK",
                incoming_result="OK",
                status=ConflictStatus.FLAGGED,
            )
        )
        await session.commit()

    r = await authed_client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    body = r.json()
    assert len(body["conflicts"]) == 1
    assert body["conflicts"][0]["branch_path"] == "1.1"


@pytest.mark.asyncio
async def test_dashboard_attention_excludes_resolved_conflicts(
    authed_client, db_session_factory
):
    project_id = await _create_project(authed_client)
    async with db_session_factory() as session:
        session.add(
            Conflict(
                project_id=project_id,
                investigation_id="inv-1",
                branch_path="1.1",
                existing_result="NOK",
                incoming_result="OK",
                status=ConflictStatus.RESOLVED,
                resolution=ConflictResolution.ACCEPT,
            )
        )
        await session.commit()

    r = await authed_client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    assert r.json()["conflicts"] == []


@pytest.mark.asyncio
async def test_dashboard_attention_returns_quorum_pending_investigations(
    authed_client, db_session_factory
):
    project_id = await _create_project(authed_client)
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        interrupt_type="validator_review",
        awaiting_quorum=True,
    )
    await _seed_investigation(
        db_session_factory,
        investigation_id=f"inv-{uuid.uuid4()}",
        project_id=project_id,
        interrupt_type="gemba_result_review",
        awaiting_quorum=False,
    )

    r = await authed_client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    assert len(r.json()["quorum"]) == 1


@pytest.mark.asyncio
async def test_dashboard_attention_always_returns_empty_assigned_gemba(authed_client):
    r = await authed_client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    assert r.json()["assignedGemba"] == []


@pytest.mark.asyncio
async def test_dashboard_attention_excludes_other_users_projects(
    authed_client, async_client, monkeypatch, add_project_member, db_session_factory
):
    project_id = await _create_project(authed_client)

    other_clerk_user_id = f"clerk_user_{uuid.uuid4()}"

    async def _other_payload(request):
        return {"sub": other_clerk_user_id, "email": f"{other_clerk_user_id}@test.com"}

    async with db_session_factory() as session:
        session.add(
            Conflict(
                project_id=project_id,
                investigation_id="inv-1",
                branch_path="1.1",
                existing_result="NOK",
                incoming_result="OK",
                status=ConflictStatus.FLAGGED,
            )
        )
        await session.commit()

    monkeypatch.setattr("core.auth.verify_clerk_token", _other_payload)
    async_client.headers["Authorization"] = "Bearer testtoken"
    await async_client.post("/api/v1/auth/sync")

    r = await async_client.get("/api/v1/dashboard/attention")
    assert r.status_code == 200
    assert r.json()["conflicts"] == []
