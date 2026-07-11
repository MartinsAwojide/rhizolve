from fastapi import Depends, HTTPException, Request

from api.middleware.scope import get_project_member
from models.project_member import ProjectMember


async def require_driver(
    investigation_id: str,
    request: Request,
    member: ProjectMember = Depends(get_project_member),
) -> ProjectMember:
    tracker = request.app.state.presence
    driver = await tracker.get_driver(investigation_id)
    if driver is None or driver["user_id"] != str(member.user_id):
        raise HTTPException(
            status_code=403, detail="Only the current driver may perform this action"
        )
    return member
