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

    if payload.mode == "deep":
        active_mode = "deep"
        if payload.action == "start_investigation":
            result = await agent.handle(message, mode="deep")
            response_text, graph_invoked = result.response, result.graph_invoked
        elif payload.action == "just_answer":
            result = await agent.handle(message, mode="shallow")
            response_text, graph_invoked = result.response, result.graph_invoked
        else:
            response_text, graph_invoked = None, False
    else:
        result = await agent.handle(message, mode=payload.mode)
        response_text, graph_invoked = result.response, result.graph_invoked
        active_mode = payload.mode

    mode_switch_card = None
    if payload.mode == "deep":
        mode_switch_card = build_mode_switch_card(
            prominence="compact" if payload.verbosity == "quiet" else "full"
        )

    return ChatResponse(
        response=response_text,
        graph_invoked=graph_invoked,
        thread_id=thread_id,
        ephemeral=ephemeral,
        mode_switch_card=mode_switch_card,
        active_mode=active_mode,
    )
