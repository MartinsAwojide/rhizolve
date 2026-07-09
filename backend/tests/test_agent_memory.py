import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from agent.memory import (
    UserMemory,
    add_investigation_summary,
    compact_memory,
    load_memory,
    memory_namespace,
)
from core.memory import make_store


def test_user_memory_defaults_to_empty():
    memory = UserMemory(user_id="u1")
    assert memory.investigation_summaries == []
    assert memory.preferences == {}


@pytest.mark.asyncio
async def test_load_memory_returns_empty_for_new_user():
    user_id = f"test-user-{uuid.uuid4()}"
    memory = await load_memory(user_id)
    assert memory.user_id == user_id
    assert memory.investigation_summaries == []
    assert memory.preferences == {}


@pytest.mark.asyncio
async def test_add_investigation_summary_persists_across_loads():
    user_id = f"test-user-{uuid.uuid4()}"
    await add_investigation_summary(
        user_id, "glue tank overflow root-caused to seal wear"
    )
    reloaded = await load_memory(user_id)
    assert reloaded.investigation_summaries == [
        "glue tank overflow root-caused to seal wear"
    ]


@pytest.mark.asyncio
async def test_compact_memory_calls_llm_and_persists_summary():
    user_id = f"test-user-{uuid.uuid4()}"
    mock_llm_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(content="user reported truck collisions at loading bay")
        )
    ]
    mock_llm_client.chat.completions.create = AsyncMock(return_value=mock_response)

    history = [{"role": "user", "content": "Trucks keep hitting the loading-bay walls"}]
    memory = await compact_memory(user_id, history, mock_llm_client)

    mock_llm_client.chat.completions.create.assert_called_once()
    assert (
        "user reported truck collisions at loading bay"
        in memory.investigation_summaries
    )

    reloaded = await load_memory(user_id)
    assert (
        "user reported truck collisions at loading bay"
        in reloaded.investigation_summaries
    )


@pytest.mark.asyncio
async def test_user_memory_round_trips_through_real_redis_store():
    memory = UserMemory(
        user_id="u1",
        investigation_summaries=["glue tank overflow root-caused to seal wear"],
        preferences={"verbosity": "quiet"},
    )
    store, ctx = await make_store()
    try:
        await store.aput(
            memory_namespace(memory.user_id), "profile", memory.model_dump()
        )
        result = await store.aget(memory_namespace(memory.user_id), "profile")
        assert result is not None
        rehydrated = UserMemory.model_validate(result.value)
        assert rehydrated == memory
    finally:
        await ctx.__aexit__(None, None, None)
