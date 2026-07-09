from pydantic import BaseModel


class UserMemory(BaseModel):
    user_id: str
    investigation_summaries: list[str] = []
    preferences: dict[str, str] = {}


def memory_namespace(user_id: str) -> tuple[str, str]:
    return ("memory", user_id)
