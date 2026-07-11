from typing import Any

from fastapi import APIRouter, Body, Depends, Request

from api.middleware.driver import require_driver
from api.middleware.quorum import require_quorum
from models.project_member import ProjectMember

router = APIRouter()


@router.post("/{project_id}/investigations/{investigation_id}/hypothesis-review")
async def hypothesis_review(
    project_id: str,
    investigation_id: str,
    request: Request,
    hypotheses: list[dict[str, Any]] | None = Body(None),
    regenerate_with_context: str | None = Body(None),
    member: ProjectMember = Depends(require_driver),
    _quorum: ProjectMember = Depends(require_quorum),
) -> dict:
    agent = request.app.state.five_whys_agent
    return await agent.submit_hypothesis_review(
        investigation_id,
        hypotheses=hypotheses,
        regenerate_with_context=regenerate_with_context,
    )


@router.post("/{project_id}/investigations/{investigation_id}/validator-review")
async def validator_review(
    project_id: str,
    investigation_id: str,
    request: Request,
    user_override_root_cause: bool = Body(...),
    user_probe_direction: str | None = Body(None),
    member: ProjectMember = Depends(require_driver),
    _quorum: ProjectMember = Depends(require_quorum),
) -> dict:
    agent = request.app.state.five_whys_agent
    return await agent.submit_validator_review(
        investigation_id,
        user_override_root_cause=user_override_root_cause,
        user_probe_direction=user_probe_direction,
    )


@router.post("/{project_id}/investigations/{investigation_id}/countermeasure-review")
async def countermeasure_review(
    project_id: str,
    investigation_id: str,
    request: Request,
    accepted: bool = Body(...),
    edit: str | None = Body(None),
    feedback: str | None = Body(None),
    member: ProjectMember = Depends(require_driver),
    _quorum: ProjectMember = Depends(require_quorum),
) -> dict:
    agent = request.app.state.five_whys_agent
    return await agent.submit_countermeasure_review(
        investigation_id,
        accepted=accepted,
        edit=edit,
        feedback=feedback,
    )
