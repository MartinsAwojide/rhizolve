from pydantic import BaseModel


class ModeSwitchCard(BaseModel):
    pill: str = "switching to deep mode"
    phenomenon: str | None = None
    domain: str | None = None
    system_or_process_context: str | None = None
    maturity: str | None = None
    maturity_source: str | None = None
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
