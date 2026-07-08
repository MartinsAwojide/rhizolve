import uuid

BTW_PREFIX = "/btw"


def is_btw(message: str) -> bool:
    return message.strip().startswith(BTW_PREFIX)


def strip_btw_prefix(message: str) -> str:
    return message.strip().removeprefix(BTW_PREFIX).strip()


def resolve_thread(message: str, thread_id: str) -> tuple[str, bool]:
    """Returns (resolved_thread_id, ephemeral)."""
    if is_btw(message):
        return f"btw-{uuid.uuid4()}", True
    return thread_id, False
