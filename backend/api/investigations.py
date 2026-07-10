from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from agent.extractor import extract_investigation_params
from agent.memory import load_memory, set_last_used_domain
from agent.schemas import InvestigationSettings, InvestigationSettingsDefaults

router = APIRouter()


class SettingsDefaultsRequest(BaseModel):
    conversation_history: list[dict[str, Any]] = []
    user_overrides: dict[str, Any] = {}
    user_id: str = "default"


@router.post("/settings/defaults")
async def get_settings_defaults(
    payload: SettingsDefaultsRequest,
) -> InvestigationSettingsDefaults:
    extracted: dict[str, Any] = {}
    if payload.conversation_history:
        raw = await extract_investigation_params(payload.conversation_history)
        extracted = {
            k: v for k, v in raw.items() if k != "confidence" and v is not None
        }

    memory = await load_memory(payload.user_id)
    static_defaults: dict[str, Any] = {}
    if "domain" in memory.preferences:
        static_defaults["domain"] = memory.preferences["domain"]

    settings = InvestigationSettings(
        extracted=extracted,
        user_overrides={
            k: v for k, v in payload.user_overrides.items() if v is not None
        },
        static_defaults=static_defaults,
    )
    resolved = settings.resolved

    if resolved.get("domain"):
        await set_last_used_domain(payload.user_id, resolved["domain"])

    return InvestigationSettingsDefaults(
        phenomenon=resolved.get("phenomenon"),
        domain=resolved.get("domain"),
        system_or_process_context=resolved.get("system_or_process_context"),
    )
