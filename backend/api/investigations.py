from fastapi import APIRouter

from agent.schemas import InvestigationSettingsDefaults

router = APIRouter()


@router.get("/settings/defaults")
async def get_settings_defaults() -> InvestigationSettingsDefaults:
    return InvestigationSettingsDefaults()
