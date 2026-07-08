import uuid

import pytest
from langgraph.checkpoint.base import empty_checkpoint

from core.memory import make_checkpointer, make_store


@pytest.fixture
async def checkpointer():
    cp, ctx = await make_checkpointer()
    yield cp
    await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_asetup_is_idempotent(checkpointer):
    await checkpointer.asetup()
    await checkpointer.asetup()  # must not raise


@pytest.mark.asyncio
async def test_state_persists_across_instances():
    thread_id = f"test-persist-{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
    metadata = {"source": "input", "step": 0, "parents": {}}

    c1, ctx1 = await make_checkpointer()
    await c1.aput(config, empty_checkpoint(), metadata, {})
    await ctx1.__aexit__(None, None, None)

    c2, ctx2 = await make_checkpointer()
    result = await c2.aget_tuple(config)
    assert result is not None
    await ctx2.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_store_put_and_get_roundtrip():
    store, ctx = await make_store()
    await store.aput(("test-ns",), "key1", {"value": "hello"})
    result = await store.aget(("test-ns",), "key1")
    assert result is not None
    assert result.value == {"value": "hello"}
    await ctx.__aexit__(None, None, None)
