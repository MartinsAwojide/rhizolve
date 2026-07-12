from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.middleware.scope import require_org_member
from core.auth import get_current_user
from core.db import get_db_session
from models.conflict import Conflict, ConflictStatus
from models.investigation import Investigation, InvestigationStatus
from models.project import Project
from models.project_member import ProjectMember
from models.user import User

router = APIRouter()


@router.get("/metrics")
async def get_dashboard_metrics(
    user: User = Depends(require_org_member),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    org_investigations = (
        select(Investigation)
        .join(Project, Investigation.project_id == Project.id)
        .where(Project.org_id == user.org_id)
        .subquery()
    )

    active_count = await session.scalar(
        select(func.count())
        .select_from(org_investigations)
        .where(org_investigations.c.status != InvestigationStatus.COMPLETE)
    )
    root_causes = await session.scalar(
        select(func.count())
        .select_from(org_investigations)
        .where(org_investigations.c.root_cause_found.is_(True))
    )
    avg_depth = await session.scalar(
        select(func.avg(org_investigations.c.current_depth)).where(
            org_investigations.c.root_cause_found.is_(True)
        )
    )
    node_total, pending_total = (
        await session.execute(
            select(
                func.coalesce(func.sum(org_investigations.c.node_count), 0),
                func.coalesce(func.sum(org_investigations.c.node_pending_count), 0),
            )
        )
    ).one()

    gemba_completion_rate = (
        1 - (pending_total / node_total) if node_total else None
    )

    return {
        "active_investigations": active_count or 0,
        "root_causes_found": root_causes or 0,
        "average_depth_to_cause": float(avg_depth) if avg_depth is not None else None,
        "gemba_completion_rate": gemba_completion_rate,
    }


@router.get("/attention")
async def get_dashboard_attention(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    member_project_ids = (
        (
            await session.execute(
                select(ProjectMember.project_id).where(
                    ProjectMember.user_id == user.id
                )
            )
        )
        .scalars()
        .all()
    )

    conflicts = (
        (
            await session.execute(
                select(Conflict).where(
                    Conflict.project_id.in_(member_project_ids),
                    Conflict.status == ConflictStatus.FLAGGED,
                )
            )
        )
        .scalars()
        .all()
    )

    quorum_pending = (
        (
            await session.execute(
                select(Investigation).where(
                    Investigation.project_id.in_(member_project_ids),
                    Investigation.awaiting_quorum.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )

    return {
        # E06 US-43 (Android Gemba assignment) not built yet -- always
        # empty until that story lands.
        "assignedGemba": [],
        "conflicts": [
            {
                "id": c.id,
                "project_id": c.project_id,
                "investigation_id": c.investigation_id,
                "branch_path": c.branch_path,
            }
            for c in conflicts
        ],
        "quorum": [
            {
                "investigation_id": i.id,
                "project_id": i.project_id,
                "current_depth": i.current_depth,
            }
            for i in quorum_pending
        ],
    }
