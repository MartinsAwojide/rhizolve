from typing import Literal

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.middleware.driver import require_driver
from core.db import get_db_session
from core.pubsub import make_channel
from models.audit_log import AuditLog, ResetType
from models.project_member import ProjectMember

router = APIRouter()


@router.post("/{project_id}/investigations/{investigation_id}/tree/reset")
async def reset_tree(
    project_id: str,
    investigation_id: str,
    request: Request,
    branch_path: str = Body(...),
    reset_type: Literal["soft", "hard"] = Body(...),
    evidence_reference: str | None = Body(None),
    member: ProjectMember = Depends(require_driver),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    agent = request.app.state.five_whys_agent
    pubsub = request.app.state.pubsub

    status = await agent.reset_tree(investigation_id, branch_path, reset_type)

    session.add(
        AuditLog(
            project_id=project_id,
            investigation_id=investigation_id,
            driver_user_id=member.user_id,
            reset_type=ResetType(reset_type),
            branch_path=branch_path,
            evidence_reference=evidence_reference,
        )
    )
    await session.commit()

    channel = make_channel(project_id, investigation_id)
    await pubsub.publish(
        channel,
        "tree_reset",
        {
            "branch_path": branch_path,
            "reset_type": reset_type,
            "driver_user_id": str(member.user_id),
        },
    )
    return status
