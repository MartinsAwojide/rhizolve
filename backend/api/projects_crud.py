from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.middleware.rbac import require_project_role
from core.auth import get_current_user
from core.db import get_db_session
from models.investigation import Investigation, InvestigationStatus
from models.organisation import Organisation
from models.project import Project, Visibility
from models.project_member import ProjectMember, Role
from models.user import User

router = APIRouter()

ProjectStatus = Literal["active", "closed", "draft"]


class ProjectCreate(BaseModel):
    name: str
    domain: str | None = None
    description: str | None = None
    visibility: Visibility
    compliance_standards: list[str] = []
    maturity_level: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    description: str | None = None
    visibility: Visibility | None = None
    compliance_standards: list[str] | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    domain: str | None
    description: str | None
    visibility: Visibility
    compliance_standards: list[str]
    maturity_level: int
    owner_id: int
    status: ProjectStatus
    active_investigation_count: int
    active_investigation_id: str | None
    member_count: int


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    role: Role
    status: str


def _project_out(
    project: Project,
    *,
    status: ProjectStatus,
    active_count: int,
    active_investigation_id: str | None = None,
    member_count: int,
) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        name=project.name,
        domain=project.domain,
        description=project.description,
        visibility=project.visibility,
        compliance_standards=project.compliance_standards,
        maturity_level=project.maturity_level,
        owner_id=project.owner_id,
        status=status,
        active_investigation_count=active_count,
        active_investigation_id=active_investigation_id,
        member_count=member_count,
    )


@router.post("")
async def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectOut:
    maturity_level = payload.maturity_level
    if maturity_level is None:
        maturity_level = 2
        if user.org_id is not None:
            org = await session.get(Organisation, user.org_id)
            if org is not None:
                maturity_level = org.maturity_level

    project = Project(
        name=payload.name,
        domain=payload.domain,
        description=payload.description,
        visibility=payload.visibility,
        compliance_standards=payload.compliance_standards,
        maturity_level=maturity_level,
        owner_id=user.id,
        org_id=user.org_id,
    )
    session.add(project)
    await session.flush()

    session.add(
        ProjectMember(
            project_id=project.id,
            user_id=user.id,
            role=Role.OWNER,
            status="active",
        )
    )
    await session.commit()
    await session.refresh(project)
    return _project_out(project, status="draft", active_count=0, member_count=1)


@router.get("")
async def list_projects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[ProjectOut]:
    result = await session.execute(
        select(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == user.id)
    )
    projects = result.scalars().all()
    project_ids = [p.id for p in projects]
    if not project_ids:
        return []

    inv_rows = (
        await session.execute(
            select(
                Investigation.project_id, Investigation.status, Investigation.id
            ).where(Investigation.project_id.in_(project_ids))
        )
    ).all()
    statuses_by_project: dict[str, list[InvestigationStatus]] = {}
    active_investigation_by_project: dict[str, str] = {}
    for project_id, inv_status, investigation_id in inv_rows:
        statuses_by_project.setdefault(project_id, []).append(inv_status)
        if inv_status != InvestigationStatus.COMPLETE:
            active_investigation_by_project.setdefault(project_id, investigation_id)

    member_count_rows = (
        await session.execute(
            select(ProjectMember.project_id, func.count())
            .where(ProjectMember.project_id.in_(project_ids))
            .group_by(ProjectMember.project_id)
        )
    ).all()
    member_counts: dict[str, int] = {row[0]: row[1] for row in member_count_rows}

    out = []
    for p in projects:
        statuses = statuses_by_project.get(p.id, [])
        active_count = sum(1 for s in statuses if s != InvestigationStatus.COMPLETE)
        if not statuses:
            status: ProjectStatus = "draft"
        elif active_count > 0:
            status = "active"
        else:
            status = "closed"
        out.append(
            _project_out(
                p,
                status=status,
                active_count=active_count,
                active_investigation_id=active_investigation_by_project.get(p.id),
                member_count=member_counts.get(p.id, 0),
            )
        )
    return out


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    _: ProjectMember = Depends(require_project_role(Role.OWNER)),
) -> ProjectOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    updates: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)
    await session.commit()
    await session.refresh(project)

    statuses = (
        (
            await session.execute(
                select(Investigation.status).where(
                    Investigation.project_id == project_id
                )
            )
        )
        .scalars()
        .all()
    )
    active_count = sum(1 for s in statuses if s != InvestigationStatus.COMPLETE)
    if not statuses:
        status: ProjectStatus = "draft"
    elif active_count > 0:
        status = "active"
    else:
        status = "closed"
    member_count = await session.scalar(
        select(func.count()).where(ProjectMember.project_id == project_id)
    )
    return _project_out(
        project, status=status, active_count=active_count, member_count=member_count or 0
    )


@router.get("/{project_id}/members")
async def list_project_members(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    _: ProjectMember = Depends(require_project_role(Role.VIEWER)),
) -> list[ProjectMemberOut]:
    result = await session.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    return [ProjectMemberOut.model_validate(m) for m in result.scalars().all()]
