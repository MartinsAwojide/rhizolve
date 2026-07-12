from fastapi import APIRouter, Depends, Request

from agent.schemas import InvestigationStatusOut
from api.middleware.scope import get_project_member
from models.project_member import ProjectMember

router = APIRouter()


@router.get("/{project_id}/investigations/{investigation_id}/status")
async def get_investigation_status(
    project_id: str,
    investigation_id: str,
    request: Request,
    _member: ProjectMember = Depends(get_project_member),
) -> InvestigationStatusOut:
    agent = request.app.state.five_whys_agent
    status = await agent.get_status(investigation_id)
    return InvestigationStatusOut(**status)
