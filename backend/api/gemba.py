import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from api.middleware.rbac import require_project_role
from api.middleware.scope import get_project_member
from core.db import get_db_session
from core.pubsub import make_channel
from models.conflict import Conflict
from models.project_member import ProjectMember, Role

router = APIRouter()


@router.post("/{project_id}/investigations/{investigation_id}/gemba")
async def submit_gemba_result(
    project_id: str,
    investigation_id: str,
    request: Request,
    result: Literal["OK", "NOK"] = Form(...),
    notes: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    transcriptions: list[str] = Form(default=[]),
    transcription_statuses: list[str] = Form(default=[]),
    # Role-only gate: ADR-006's EXTERNAL_PERMITTED_ACTIONS lists
    # submit_gemba_result as allowed for external operator/contributor, so
    # no require_internal_scope() here — that would wrongly block them.
    _role: ProjectMember = Depends(require_project_role(Role.OPERATOR)),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """files/transcriptions/transcription_statuses are index-aligned
    parallel lists — the i-th file's transcription metadata is
    transcriptions[i]/transcription_statuses[i], if present."""
    storage = request.app.state.attachment_storage
    agent = request.app.state.five_whys_agent

    attachments = []
    for i, f in enumerate(files):
        key, content_type = await storage.upload(investigation_id, f)
        att_type = "audio" if content_type.startswith("audio") else "image"
        attachment = {
            "id": str(uuid.uuid4()),
            "type": att_type,
            "url": storage.get_url(project_id, key),
            "filename": f.filename or "",
            "content_type": content_type,
        }
        if att_type == "audio":
            if i < len(transcriptions):
                attachment["transcription"] = transcriptions[i]
            attachment["transcription_status"] = (
                transcription_statuses[i]
                if i < len(transcription_statuses)
                else "unavailable"
            )
        attachments.append(attachment)

    status = await agent.submit_gemba(
        investigation_id, result=result, notes=notes, attachments=attachments
    )

    if status.get("conflict"):
        conflict = Conflict(
            project_id=project_id,
            investigation_id=investigation_id,
            branch_path=status["branch_path"],
            existing_result=status["existing_result"],
            incoming_result=status["incoming_result"],
            incoming_notes=status["incoming_notes"],
        )
        session.add(conflict)
        await session.commit()
        await session.refresh(conflict)

        pubsub = request.app.state.pubsub
        await pubsub.publish(
            make_channel(project_id, investigation_id),
            "conflict_flagged",
            {
                "conflict_id": conflict.id,
                "branch_path": conflict.branch_path,
                "existing_result": conflict.existing_result,
                "incoming_result": conflict.incoming_result,
            },
        )
        return {**status, "conflict_id": conflict.id}

    return {**status, "attachments": attachments}


@router.get("/{project_id}/attachments/{investigation_id}/{filename}")
async def get_attachment(
    project_id: str,
    investigation_id: str,
    filename: str,
    request: Request,
    _member: ProjectMember = Depends(get_project_member),
) -> Response:
    storage = request.app.state.attachment_storage
    content = await storage.read(f"{investigation_id}/{filename}")
    return Response(content=content)
