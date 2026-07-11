import redis.asyncio as redis


def _ready_key(investigation_id: str, user_id: str) -> str:
    return f"ready:{investigation_id}:{user_id}"


def _ready_prefix(investigation_id: str) -> str:
    return f"ready:{investigation_id}:*"


class ReadyTracker:
    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client

    async def toggle(self, investigation_id: str, user_id: str) -> bool:
        key = _ready_key(investigation_id, user_id)
        exists = await self._redis.exists(key)
        if exists:
            await self._redis.delete(key)
            return False
        await self._redis.set(key, "1")
        return True

    async def get_ready_ids(self, investigation_id: str) -> set[str]:
        keys = [
            key
            async for key in self._redis.scan_iter(
                match=_ready_prefix(investigation_id)
            )
        ]
        if not keys:
            return set()
        return {
            (k.decode() if isinstance(k, bytes) else k).rsplit(":", 1)[-1] for k in keys
        }
