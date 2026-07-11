from fastapi import APIRouter, Body, Depends, Request

from api.middleware.scope import get_project_member
from core.pubsub import make_channel
from models.project_member import ProjectMember

router = APIRouter()


@router.post("/{project_id}/investigations/{investigation_id}/presence/heartbeat")
async def presence_heartbeat(
    project_id: str,
    investigation_id: str,
    request: Request,
    editing: bool = Body(False),
    editing_node: str | None = Body(None),
    member: ProjectMember = Depends(get_project_member),
) -> dict:
    tracker = request.app.state.presence
    pubsub = request.app.state.pubsub

    result = await tracker.heartbeat(
        investigation_id,
        str(member.user_id),
        member.user.display_name,
        role=member.role.value,
        editing=editing,
        editing_node=editing_node,
    )
    channel = make_channel(project_id, investigation_id)
    if result["is_new"]:
        await pubsub.publish(channel, "user_joined", {"user_id": str(member.user_id)})
    if result["editing_changed"]:
        await pubsub.publish(
            channel,
            "user_editing",
            {
                "user_id": str(member.user_id),
                "editing": editing,
                "editing_node": editing_node,
            },
        )
    if result["driver_changed"]:
        await pubsub.publish(channel, "driver_changed", {"driver": result["driver"]})
    await pubsub.publish(channel, "presence_snapshot", {"users": result["snapshot"]})
    return {"users": result["snapshot"]}
