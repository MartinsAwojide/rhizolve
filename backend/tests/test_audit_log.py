import uuid

import pytest
from sqlalchemy import select

from models.audit_log import AuditLog, ResetType


@pytest.mark.asyncio
async def test_audit_log_row_created_with_all_fields(authed_client, db_session_factory):
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    project_id = r.json()["id"]
    user_id = authed_client.current_user["id"]
    investigation_id = str(uuid.uuid4())

    async with db_session_factory() as session:
        session.add(
            AuditLog(
                project_id=project_id,
                investigation_id=investigation_id,
                driver_user_id=user_id,
                reset_type=ResetType.SOFT,
                branch_path="root.h1",
                evidence_reference="photo-123",
            )
        )
        await session.commit()

        result = await session.execute(
            select(AuditLog).where(AuditLog.investigation_id == investigation_id)
        )
        row = result.scalar_one()
        assert row.project_id == project_id
        assert row.driver_user_id == user_id
        assert row.reset_type == ResetType.SOFT
        assert row.branch_path == "root.h1"
        assert row.evidence_reference == "photo-123"
        assert row.created_at is not None
