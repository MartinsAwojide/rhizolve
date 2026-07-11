import json
from typing import Any

import redis.asyncio as redis

PRESENCE_TTL_SECONDS = 8


def _presence_key(investigation_id: str, user_id: str) -> str:
    return f"presence:{investigation_id}:{user_id}"


def _presence_prefix(investigation_id: str) -> str:
    return f"presence:{investigation_id}:*"


class PresenceTracker:
    def __init__(
        self, redis_client: redis.Redis, ttl_seconds: int = PRESENCE_TTL_SECONDS
    ) -> None:
        self._redis = redis_client
        self._ttl_seconds = ttl_seconds

    async def heartbeat(
        self,
        investigation_id: str,
        user_id: str,
        name: str | None,
        editing: bool = False,
        editing_node: str | None = None,
    ) -> dict[str, Any]:
        key = _presence_key(investigation_id, user_id)
        previous_raw = await self._redis.get(key)
        previous = json.loads(previous_raw) if previous_raw else None

        is_new = previous is None
        editing_changed = previous is None or previous.get("editing") != editing

        value = {
            "user_id": user_id,
            "name": name,
            "editing": editing,
            "editing_node": editing_node,
        }
        await self._redis.set(key, json.dumps(value), ex=self._ttl_seconds)

        snapshot = await self.list_active(investigation_id)
        return {
            "is_new": is_new,
            "editing_changed": editing_changed,
            "snapshot": snapshot,
        }

    async def list_active(self, investigation_id: str) -> list[dict[str, Any]]:
        keys = [
            key
            async for key in self._redis.scan_iter(
                match=_presence_prefix(investigation_id)
            )
        ]
        if not keys:
            return []
        values = await self._redis.mget(keys)
        return [json.loads(v) for v in values if v is not None]
