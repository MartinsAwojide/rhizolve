from fastapi import Depends, HTTPException, Request

from api.middleware.scope import get_project_member
from core.quorum import check_quorum
from models.project_member import ProjectMember


async def require_quorum(
    investigation_id: str,
    request: Request,
    member: ProjectMember = Depends(get_project_member),
) -> ProjectMember:
    presence = request.app.state.presence
    ready = request.app.state.ready
    active = await presence.list_active(investigation_id)
    ready_ids = await ready.get_ready_ids(investigation_id)
    if not check_quorum(active, ready_ids):
        raise HTTPException(status_code=403, detail="Quorum not reached")
    return member
