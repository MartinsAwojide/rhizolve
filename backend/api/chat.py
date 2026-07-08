from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from agent.btw import is_btw, resolve_thread, strip_btw_prefix
from agent.conversation import ConversationalAgent
from agent.mode_switch import build_mode_switch_card
from agent.schemas import ChatResponse
from core.llm import get_llm_client

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    mode: str = "shallow"
    thread_id: str = "default"
    verbosity: Literal["verbose", "quiet"] = "verbose"
    action: Literal["just_answer", "start_investigation"] | None = None


@router.post("/chat")
async def chat(payload: ChatRequest) -> ChatResponse:
    thread_id, ephemeral = resolve_thread(payload.message, payload.thread_id)
    message = (
        strip_btw_prefix(payload.message)
        if is_btw(payload.message)
        else payload.message
    )

    agent = ConversationalAgent(llm_client=get_llm_client())

    if payload.mode == "deep" and payload.action == "just_answer":
        result = await agent.handle(message, mode="shallow")
        active_mode = "deep"
    else:
        result = await agent.handle(message, mode=payload.mode)
        active_mode = payload.mode

    mode_switch_card = None
    if payload.mode == "deep":
        mode_switch_card = build_mode_switch_card(
            prominence="compact" if payload.verbosity == "quiet" else "full"
        )

    return ChatResponse(
        response=result.response,
        graph_invoked=result.graph_invoked,
        thread_id=thread_id,
        ephemeral=ephemeral,
        mode_switch_card=mode_switch_card,
        active_mode=active_mode,
    )
