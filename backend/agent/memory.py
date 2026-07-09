from typing import Any, cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel

from core.config import OPENROUTER_MODEL
from core.memory import make_store


class UserMemory(BaseModel):
    user_id: str
    investigation_summaries: list[str] = []
    preferences: dict[str, str] = {}


def memory_namespace(user_id: str) -> tuple[str, str]:
    return ("memory", user_id)


async def load_memory(user_id: str) -> UserMemory:
    store, ctx = await make_store()
    try:
        result = await store.aget(memory_namespace(user_id), "profile")
        if result is None:
            return UserMemory(user_id=user_id)
        return UserMemory.model_validate(result.value)
    finally:
        await ctx.__aexit__(None, None, None)


async def _save_memory(memory: UserMemory) -> None:
    store, ctx = await make_store()
    try:
        await store.aput(
            memory_namespace(memory.user_id), "profile", memory.model_dump()
        )
    finally:
        await ctx.__aexit__(None, None, None)


async def add_investigation_summary(user_id: str, investigation: str) -> UserMemory:
    memory = await load_memory(user_id)
    memory.investigation_summaries.append(investigation)
    await _save_memory(memory)
    return memory


_COMPACTION_SYSTEM_PROMPT = (
    "Summarize this conversation concisely for long-term memory, "
    "preserving the key problem, findings, and any decisions made."
)


async def compact_memory(
    user_id: str,
    conversation_history: list[dict[str, Any]],
    llm_client: AsyncOpenAI,
) -> UserMemory:
    messages = cast(
        list[ChatCompletionMessageParam],
        [
            {"role": "system", "content": _COMPACTION_SYSTEM_PROMPT},
            *conversation_history,
        ],
    )
    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=messages,
    )
    summary = completion.choices[0].message.content or ""
    memory = await load_memory(user_id)
    memory.investigation_summaries.append(summary)
    await _save_memory(memory)
    return memory
