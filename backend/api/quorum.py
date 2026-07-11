from fastapi import APIRouter, Depends, Request

from api.middleware.scope import get_project_member
from core.pubsub import make_channel
from core.quorum import check_quorum
from models.project_member import ProjectMember

router = APIRouter()


@router.post("/{project_id}/investigations/{investigation_id}/ready")
async def toggle_ready(
    project_id: str,
    investigation_id: str,
    request: Request,
    member: ProjectMember = Depends(get_project_member),
) -> dict:
    ready_tracker = request.app.state.ready
    presence = request.app.state.presence
    pubsub = request.app.state.pubsub

    active = await presence.list_active(investigation_id)
    ready_ids_before = await ready_tracker.get_ready_ids(investigation_id)
    quorum_before = check_quorum(active, ready_ids_before)

    new_state = await ready_tracker.toggle(investigation_id, str(member.user_id))

    ready_ids_after = await ready_tracker.get_ready_ids(investigation_id)
    quorum_after = check_quorum(active, ready_ids_after)

    channel = make_channel(project_id, investigation_id)
    if quorum_after and not quorum_before:
        await pubsub.publish(
            channel, "quorum_reached", {"ready_user_ids": list(ready_ids_after)}
        )
    elif quorum_before and not quorum_after:
        await pubsub.publish(
            channel, "quorum_lost", {"ready_user_ids": list(ready_ids_after)}
        )

    return {"user_id": str(member.user_id), "ready": new_state, "quorum": quorum_after}
