from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import get_current_user
from core.db import get_db_session
from models.project_member import MembershipScope, ProjectMember
from models.user import User


async def get_project_member(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectMember:
    result = await session.execute(
        select(ProjectMember)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.status == "active",
        )
        .options(selectinload(ProjectMember.user), selectinload(ProjectMember.project))
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return membership


async def require_internal_scope(
    member: ProjectMember = Depends(get_project_member),
) -> ProjectMember:
    if member.scope == MembershipScope.EXTERNAL:
        raise HTTPException(
            status_code=403, detail="External members cannot access this resource"
        )
    return member


async def require_org_member(user: User = Depends(get_current_user)) -> User:
    """Gate for org-wide (project_id-less) resources.

    Checks only "does this user have a home org at all" -- it does not
    model "internal to a specific project" like require_internal_scope
    does, since org-scoped routes have no project_id path param to check
    membership against.
    """
    if user.org_id is None:
        raise HTTPException(
            status_code=403,
            detail="No organisation membership for org-scoped resource",
        )
    return user
