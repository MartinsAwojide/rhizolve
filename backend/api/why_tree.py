from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agent.schemas import ReportOut, WhyNodeOut
from api.middleware.scope import get_project_member
from core.db import get_db_session
from models.conflict import Conflict, ConflictStatus
from models.project_member import ProjectMember

router = APIRouter()


@router.get("/{project_id}/investigations/{investigation_id}/tree")
async def get_tree(
    project_id: str,
    investigation_id: str,
    request: Request,
    _member: ProjectMember = Depends(get_project_member),
    session: AsyncSession = Depends(get_db_session),
) -> list[WhyNodeOut]:
    agent = request.app.state.five_whys_agent
    why_nodes = await agent.get_tree(investigation_id)

    flagged = await session.execute(
        select(Conflict.branch_path).where(
            Conflict.project_id == project_id,
            Conflict.investigation_id == investigation_id,
            Conflict.status == ConflictStatus.FLAGGED,
        )
    )
    conflicted_branches = {row[0] for row in flagged}

    return [
        WhyNodeOut(**node, conflict=node["branch_path"] in conflicted_branches)
        for node in why_nodes
    ]


@router.get("/{project_id}/investigations/{investigation_id}/report")
async def get_report(
    investigation_id: str,
    request: Request,
    _member: ProjectMember = Depends(get_project_member),
) -> ReportOut:
    agent = request.app.state.five_whys_agent
    report = await agent.get_report(investigation_id)
    return ReportOut(
        investigation_id=report["investigation_id"],
        phenomenon=report["phenomenon"],
        domain=report["domain"],
        why_nodes=[WhyNodeOut(**node) for node in report["why_nodes"]],
        root_cause=report["root_cause"],
        countermeasure=report["countermeasure"],
    )
