import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, get_or_create_user_by_clerk_id
from core.config import FRONTEND_URL
from core.db import get_db_session
from core.email import send_external_invitation_email, send_invitation_email
from models.project import Project
from models.project_invitation import INVITATION_VALIDITY, ProjectInvitation
from models.project_member import ProjectMember, Role
from models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

EXTERNAL_ALLOWED_ROLES = frozenset({Role.CONTRIBUTOR, Role.OPERATOR, Role.VIEWER})


class InviteInternalMember(BaseModel):
    clerk_user_id: str
    role: Role


class InviteExternalMember(BaseModel):
    email: EmailStr
    role: Role


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    user_id: int
    role: Role
    status: str


class ProjectInvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    email: str
    role: Role
    status: str


async def _require_owner(
    session: AsyncSession, project_id: str, user: User
) -> ProjectMember:
    result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None or membership.role != Role.OWNER:
        raise HTTPException(
            status_code=403, detail="Only the project owner can invite members"
        )
    return membership


@router.post("/{project_id}/members/internal")
async def invite_internal_member(
    project_id: str,
    payload: InviteInternalMember,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectMemberOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    await _require_owner(session, project_id, user)

    target_user = await get_or_create_user_by_clerk_id(session, payload.clerk_user_id)

    existing = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Member already invited")

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id,
        role=payload.role,
        status="pending",
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)

    if target_user.email:
        try:
            await send_invitation_email(
                target_user.email, project.name, payload.role.value
            )
        except Exception:
            logger.exception("Failed to send invitation email to %s", target_user.email)

    return ProjectMemberOut.model_validate(member)


@router.post("/{project_id}/members/accept")
async def accept_invite(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectMemberOut:
    result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.status == "pending",
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="No pending invite found")

    member.status = "active"
    await session.commit()
    await session.refresh(member)
    return ProjectMemberOut.model_validate(member)


def _invite_link(token: str) -> str:
    return f"{FRONTEND_URL}/invites/accept?token={token}"


@router.post("/{project_id}/members/external")
async def invite_external_member(
    project_id: str,
    payload: InviteExternalMember,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectInvitationOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    await _require_owner(session, project_id, user)

    if payload.role not in EXTERNAL_ALLOWED_ROLES:
        raise HTTPException(
            status_code=422,
            detail="External invitees are limited to contributor, operator, or viewer",
        )

    invitation = ProjectInvitation(
        project_id=project_id, email=payload.email, role=payload.role
    )
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)

    try:
        await send_external_invitation_email(
            invitation.email,
            project.name,
            payload.role.value,
            _invite_link(invitation.token),
        )
    except Exception:
        logger.exception("Failed to send external invitation to %s", invitation.email)

    return ProjectInvitationOut.model_validate(invitation)


@router.post("/{project_id}/invites/{invitation_id}/resend")
async def resend_external_invite(
    project_id: str,
    invitation_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectInvitationOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    await _require_owner(session, project_id, user)

    result = await session.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.project_id == project_id,
        )
    )
    invitation = result.scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invitation.token = secrets.token_urlsafe(32)
    invitation.expires_at = datetime.now(timezone.utc) + INVITATION_VALIDITY
    await session.commit()
    await session.refresh(invitation)

    try:
        await send_external_invitation_email(
            invitation.email,
            project.name,
            invitation.role.value,
            _invite_link(invitation.token),
        )
    except Exception:
        logger.exception("Failed to resend external invitation to %s", invitation.email)

    return ProjectInvitationOut.model_validate(invitation)
