import asyncio
import contextlib
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from api.middleware.scope import get_project_member
from core.pubsub import make_channel
from models.project_member import ProjectMember

router = APIRouter()

# How often to re-check request.is_disconnected() while waiting for the next
# pub/sub event. Without this, a subscriber with no traffic would block in
# pubsub.listen() forever and never notice the client disconnected.
_DISCONNECT_POLL_SECONDS = 1.0


@router.get("/{project_id}/investigations/{investigation_id}/stream")
async def stream_investigation(
    project_id: str,
    investigation_id: str,
    request: Request,
    _member: ProjectMember = Depends(get_project_member),
) -> StreamingResponse:
    pubsub = request.app.state.pubsub
    channel = make_channel(project_id, investigation_id)

    async def event_source() -> AsyncIterator[str]:
        gen = pubsub.subscribe(channel)
        # Never cancel a pending gen.__anext__() on a disconnect-poll timeout
        # (that unwinds the generator's finally block, closing the pubsub
        # connection) — keep the same pending task alive across polls.
        next_task = asyncio.ensure_future(gen.__anext__())
        try:
            while True:
                if await request.is_disconnected():
                    break
                done, _pending = await asyncio.wait(
                    {next_task}, timeout=_DISCONNECT_POLL_SECONDS
                )
                if not done:
                    continue
                try:
                    event = next_task.result()
                except StopAsyncIteration:
                    break
                yield f"data: {json.dumps(event)}\n\n"
                next_task = asyncio.ensure_future(gen.__anext__())
        finally:
            next_task.cancel()
            with contextlib.suppress(asyncio.CancelledError, StopAsyncIteration):
                await next_task
            await gen.aclose()

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
