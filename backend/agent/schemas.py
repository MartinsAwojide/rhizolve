from typing import Any, Literal

from pydantic import BaseModel


class ModeSwitchCard(BaseModel):
    pill: str = "switching to deep mode"
    phenomenon: str | None = None
    domain: str | None = None
    system_or_process_context: str | None = None
    maturity: str | None = None
    maturity_source: str | None = None
    prominence: Literal["full", "compact"] = "full"
    actions: list[str] = [
        "Start investigation",
        "Edit settings",
        "Just answer instead",
    ]


class ChatResponse(BaseModel):
    response: str | None = None
    graph_invoked: bool
    thread_id: str = ""
    ephemeral: bool = False
    mode_switch_card: ModeSwitchCard | None = None
    active_mode: str = "shallow"
    investigation_id: str | None = None


class ExtractionOutput(BaseModel):
    phenomenon: str | None = None
    domain: str | None = None
    system_or_process_context: str | None = None
    confidence: dict[str, float] = {}


class InvestigationSettingsDefaults(BaseModel):
    phenomenon: str | None = None
    domain: str | None = None
    system_or_process_context: str | None = None
    maturity: str = "unknown"
    maturity_source: str = "default"


class InvestigationSettings(BaseModel):
    extracted: dict[str, Any] = {}
    user_overrides: dict[str, Any] = {}
    static_defaults: dict[str, Any] = {}

    @property
    def resolved(self) -> dict[str, Any]:
        return {**self.static_defaults, **self.extracted, **self.user_overrides}


class AttachmentOut(BaseModel):
    id: str
    type: Literal["image", "audio"]
    url: str
    filename: str
    content_type: str
    transcription: str | None = None
    transcription_status: Literal["pending", "complete", "unavailable"] | None = None


class WhyNodeOut(BaseModel):
    id: str
    branch_path: str
    depth: int
    hypothesis: str
    gemba_result: Literal["OK", "NOK", "ROOT_CAUSE", "pending"]
    gemba_notes: str
    is_root_cause: bool
    countermeasure: str
    status: Literal["active", "closed", "suspended", "deleted"] | None = None
    model_attribution: str | None = None
    attachments: list[AttachmentOut] | None = None
    conflict: bool = False


class InvestigationStatusOut(BaseModel):
    investigation_id: str
    status: Literal["awaiting_gemba", "complete"]
    interrupt_type: (
        Literal[
            "hypothesis_review",
            "gemba_result_review",
            "validator_review",
            "countermeasure_review",
        ]
        | None
    )
    pending_hypotheses: list[dict[str, Any]]
    node: WhyNodeOut | None


class ReportOut(BaseModel):
    investigation_id: str
    phenomenon: str
    domain: str
    why_nodes: list[WhyNodeOut]
    root_cause: str | None
    countermeasure: str | None
