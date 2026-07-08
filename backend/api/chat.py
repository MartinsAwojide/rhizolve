from fastapi import APIRouter
from pydantic import BaseModel

from agent.btw import is_btw, resolve_thread, strip_btw_prefix
from agent.conversation import ConversationalAgent
from agent.schemas import ChatResponse
from core.llm import get_llm_client

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    mode: str = "shallow"
    thread_id: str = "default"
    verbose: bool = True


@router.post("/chat")
async def chat(payload: ChatRequest) -> ChatResponse:
    thread_id, ephemeral = resolve_thread(payload.message, payload.thread_id)
    message = (
        strip_btw_prefix(payload.message)
        if is_btw(payload.message)
        else payload.message
    )

    agent = ConversationalAgent(llm_client=get_llm_client())
    result = await agent.handle(message, mode=payload.mode)

    return ChatResponse(
        response=result.response,
        graph_invoked=result.graph_invoked,
        thread_id=thread_id,
        ephemeral=ephemeral,
    )
