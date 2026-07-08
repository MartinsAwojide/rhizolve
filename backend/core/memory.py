from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from core.config import REDIS_URL


async def make_checkpointer() -> tuple[AsyncRedisSaver, AsyncRedisSaver]:
    ctx = AsyncRedisSaver.from_conn_string(REDIS_URL)
    checkpointer = await ctx.__aenter__()
    await checkpointer.asetup()
    return checkpointer, ctx
