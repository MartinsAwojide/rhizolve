import pytest

from agent.memory import UserMemory, memory_namespace
from core.memory import make_store


def test_user_memory_defaults_to_empty():
    memory = UserMemory(user_id="u1")
    assert memory.investigation_summaries == []
    assert memory.preferences == {}


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
