from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()


class ContextInjectionRequest(BaseModel):
    context: str


@router.post("/{project_id}/investigations/{investigation_id}/context")
async def inject_context(
    project_id: str,
    investigation_id: str,
    payload: ContextInjectionRequest,
    request: Request,
) -> dict[str, str]:
    agent = request.app.state.five_whys_agent
    thread_id = f"{project_id}:{investigation_id}"
    await agent.inject_context(thread_id, payload.context)
    return {"status": "ok"}
