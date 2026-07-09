import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from agent.memory import (
    UserMemory,
    add_investigation_summary,
    compact_memory,
    estimate_token_count,
    load_memory,
    mark_ephemeral,
    maybe_compact_memory,
    memory_namespace,
    should_compact,
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


def test_should_compact_false_under_threshold():
    history = [{"role": "user", "content": "why do trucks hit the wall"}]
    assert should_compact(history) is False


def test_should_compact_true_over_threshold():
    long_history = [{"role": "user", "content": "x" * 500}] * 200
    assert should_compact(long_history, context_window=1000) is True


@pytest.mark.asyncio
async def test_maybe_compact_memory_skips_when_under_threshold():
    user_id = f"test-user-{uuid.uuid4()}"
    mock_llm_client = AsyncMock()
    mock_llm_client.chat.completions.create = AsyncMock()

    history = [{"role": "user", "content": "why do trucks hit the wall"}]
    result = await maybe_compact_memory(user_id, history, mock_llm_client)

    assert result is None
    mock_llm_client.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_maybe_compact_memory_compacts_when_over_threshold():
    user_id = f"test-user-{uuid.uuid4()}"
    mock_llm_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="compacted summary"))]
    mock_llm_client.chat.completions.create = AsyncMock(return_value=mock_response)

    long_history = [{"role": "user", "content": "x" * 500}] * 200
    result = await maybe_compact_memory(
        user_id, long_history, mock_llm_client, context_window=1000
    )

    assert result is not None
    mock_llm_client.chat.completions.create.assert_called_once()
    assert "compacted summary" in result.investigation_summaries


def test_mark_ephemeral_stamps_flag():
    messages = [{"role": "user", "content": "/btw what is FMEA?"}]
    marked = mark_ephemeral(messages)
    assert marked[0]["ephemeral"] is True
    assert marked[0]["content"] == "/btw what is FMEA?"
    assert "ephemeral" not in messages[0]


def test_ephemeral_messages_count_double_toward_token_estimate():
    normal = [{"role": "user", "content": "x" * 100}]
    ephemeral = mark_ephemeral(normal)
    assert estimate_token_count(ephemeral) == estimate_token_count(normal) * 2


def test_should_compact_triggers_earlier_for_ephemeral_history():
    history = [{"role": "user", "content": "x" * 500}] * 100
    ephemeral_history = mark_ephemeral(history)

    context_window = estimate_token_count(history) * 2
    assert should_compact(history, context_window=context_window) is False
    assert should_compact(ephemeral_history, context_window=context_window) is True


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
