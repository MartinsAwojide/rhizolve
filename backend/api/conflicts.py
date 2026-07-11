from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.middleware.driver import require_driver
from core.db import get_db_session
from core.pubsub import make_channel
from models.conflict import Conflict, ConflictResolution, ConflictStatus
from models.project_member import ProjectMember

router = APIRouter()


@router.post(
    "/{project_id}/investigations/{investigation_id}/conflicts/{conflict_id}/resolve"
)
async def resolve_conflict(
    project_id: str,
    investigation_id: str,
    conflict_id: int,
    request: Request,
    action: Literal["accept", "reset"] = Body(...),
    reset_type: Literal["soft", "hard"] = Body("soft"),
    member: ProjectMember = Depends(require_driver),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    conflict = await session.get(Conflict, conflict_id)
    if conflict is None:
        raise HTTPException(status_code=404, detail="Conflict not found")
    if conflict.status == ConflictStatus.RESOLVED:
        raise HTTPException(status_code=409, detail="Conflict already resolved")

    if action == "reset":
        agent = request.app.state.five_whys_agent
        await agent.reset_tree(investigation_id, conflict.branch_path, reset_type)

    conflict.status = ConflictStatus.RESOLVED
    conflict.resolution = ConflictResolution(action)
    conflict.resolved_by_user_id = member.user_id
    conflict.resolved_at = datetime.now(timezone.utc)
    await session.commit()

    pubsub = request.app.state.pubsub
    await pubsub.publish(
        make_channel(project_id, investigation_id),
        "conflict_resolved",
        {
            "conflict_id": conflict.id,
            "action": action,
            "branch_path": conflict.branch_path,
        },
    )
    return {"conflict_id": conflict.id, "status": "resolved", "action": action}
