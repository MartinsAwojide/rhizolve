from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_db_session
from models.project_invitation import ProjectInvitation
from models.project_member import Role

router = APIRouter()


class ProjectInvitationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    email: str
    role: Role
    status: str


@router.get("/{token}")
async def get_invite(
    token: str, session: AsyncSession = Depends(get_db_session)
) -> ProjectInvitationDetail:
    result = await session.execute(
        select(ProjectInvitation).where(ProjectInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation has expired")
    return ProjectInvitationDetail.model_validate(invitation)
