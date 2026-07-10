from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.db import get_db_session
from models.project_member import ROLE_RANK, ProjectMember, Role
from models.user import User


def require_project_role(minimum_role: Role):
    async def _dependency(
        project_id: str,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_db_session),
    ) -> ProjectMember:
        result = await session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
                ProjectMember.status == "active",
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None or ROLE_RANK[membership.role] > ROLE_RANK[minimum_role]:
            raise HTTPException(
                status_code=403, detail="Insufficient project role for this action"
            )
        return membership

    return _dependency
