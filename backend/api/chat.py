from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from agent.btw import is_btw, resolve_thread, strip_btw_prefix
from agent.conversation import ConversationalAgent
from agent.extractor import extract_investigation_params
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
    project_id: str | None = None


@router.post("/chat")
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    thread_id, ephemeral = resolve_thread(payload.message, payload.thread_id)
    message = (
        strip_btw_prefix(payload.message)
        if is_btw(payload.message)
        else payload.message
    )

    agent = ConversationalAgent(llm_client=get_llm_client())
    investigation_id = None

    if payload.mode == "deep":
        active_mode = "deep"
        if payload.action == "start_investigation":
            if payload.project_id is not None:
                params = await extract_investigation_params(
                    [{"role": "user", "content": message}]
                )
                five_whys_agent = request.app.state.five_whys_agent
                started = await five_whys_agent.start_investigation(
                    phenomenon=params.get("phenomenon") or message,
                    domain=params.get("domain") or "",
                    system_or_process_context=params.get(
                        "system_or_process_context"
                    )
                    or "",
                    project_id=payload.project_id,
                )
                investigation_id = started["investigation_id"]
                response_text, graph_invoked = None, True
            else:
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
        investigation_id=investigation_id,
    )
