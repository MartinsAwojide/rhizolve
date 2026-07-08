from pydantic import BaseModel


class ChatResponse(BaseModel):
    response: str | None = None
    graph_invoked: bool
