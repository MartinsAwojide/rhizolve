from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.db import get_db_session
from models.organisation import Organisation
from models.project import Project, Visibility
from models.project_member import ProjectMember, Role
from models.user import User

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    domain: str | None = None
    visibility: Visibility
    compliance_standards: list[str] = []
    maturity_level: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    visibility: Visibility | None = None
    compliance_standards: list[str] | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    domain: str | None
    visibility: Visibility
    compliance_standards: list[str]
    maturity_level: int
    owner_id: int


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    role: Role
    status: str


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
        visibility=payload.visibility,
        compliance_standards=payload.compliance_standards,
        maturity_level=maturity_level,
        owner_id=user.id,
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
    return ProjectOut.model_validate(project)


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
    return [ProjectOut.model_validate(p) for p in result.scalars().all()]


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ProjectOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    updates: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)
    await session.commit()
    await session.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/{project_id}/members")
async def list_project_members(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[ProjectMemberOut]:
    result = await session.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    return [ProjectMemberOut.model_validate(m) for m in result.scalars().all()]
