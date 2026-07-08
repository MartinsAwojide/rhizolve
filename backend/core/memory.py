from contextlib import AbstractAsyncContextManager

from langgraph.checkpoint.redis.aio import AsyncRedisSaver
from langgraph.store.redis.aio import AsyncRedisStore

from core.config import REDIS_URL


async def make_checkpointer() -> tuple[
    AsyncRedisSaver, AbstractAsyncContextManager[AsyncRedisSaver]
]:
    ctx = AsyncRedisSaver.from_conn_string(REDIS_URL)
    checkpointer = await ctx.__aenter__()
    await checkpointer.asetup()
    return checkpointer, ctx


async def make_store() -> tuple[
    AsyncRedisStore, AbstractAsyncContextManager[AsyncRedisStore]
]:
    ctx = AsyncRedisStore.from_conn_string(REDIS_URL)
    store = await ctx.__aenter__()
    await store.setup()
    return store, ctx
