from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from api.middleware.rbac import require_project_role
from api.middleware.scope import require_internal_scope
from models.project_member import ProjectMember, Role

router = APIRouter()


class ContextInjectionRequest(BaseModel):
    context: str


@router.post("/{project_id}/investigations/{investigation_id}/context")
async def inject_context(
    project_id: str,
    investigation_id: str,
    payload: ContextInjectionRequest,
    request: Request,
    _role: ProjectMember = Depends(require_project_role(Role.CONTRIBUTOR)),
    _scope: ProjectMember = Depends(require_internal_scope),
) -> dict[str, str]:
    agent = request.app.state.five_whys_agent
    thread_id = f"{project_id}:{investigation_id}"
    await agent.inject_context(thread_id, payload.context)
    return {"status": "ok"}
