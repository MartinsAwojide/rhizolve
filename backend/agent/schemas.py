from pydantic import BaseModel


class ChatResponse(BaseModel):
    response: str | None = None
    graph_invoked: bool
    thread_id: str = ""
    ephemeral: bool = False
