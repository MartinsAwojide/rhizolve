import json
from datetime import datetime, timezone
from typing import Any, cast

import redis.asyncio as redis

from core.driver import ActiveParticipant, resolve_driver

PRESENCE_TTL_SECONDS = 8


def _presence_key(investigation_id: str, user_id: str) -> str:
    return f"presence:{investigation_id}:{user_id}"


def _presence_prefix(investigation_id: str) -> str:
    return f"presence:{investigation_id}:*"


def _driver_key(investigation_id: str) -> str:
    return f"driver:{investigation_id}"


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
        role: str,
        editing: bool = False,
        editing_node: str | None = None,
    ) -> dict[str, Any]:
        key = _presence_key(investigation_id, user_id)
        previous_raw = await self._redis.get(key)
        previous = json.loads(previous_raw) if previous_raw else None

        is_new = previous is None
        editing_changed = previous is None or previous.get("editing") != editing
        joined_at = (
            previous["joined_at"]
            if previous is not None
            else datetime.now(timezone.utc).isoformat()
        )

        value = {
            "user_id": user_id,
            "name": name,
            "role": role,
            "joined_at": joined_at,
            "editing": editing,
            "editing_node": editing_node,
        }
        await self._redis.set(key, json.dumps(value), ex=self._ttl_seconds)

        snapshot = await self.list_active(investigation_id)

        driver = resolve_driver(cast(list[ActiveParticipant], snapshot))
        driver_key = _driver_key(investigation_id)
        previous_driver = await self.get_driver(investigation_id)
        driver_changed = (previous_driver is None) != (driver is None) or (
            driver is not None
            and previous_driver is not None
            and previous_driver.get("user_id") != driver["user_id"]
        )
        if driver is not None:
            await self._redis.set(driver_key, json.dumps(driver), ex=self._ttl_seconds)
        elif previous_driver is not None:
            await self._redis.delete(driver_key)

        return {
            "is_new": is_new,
            "editing_changed": editing_changed,
            "snapshot": snapshot,
            "driver": driver,
            "driver_changed": driver_changed,
        }

    async def get_driver(self, investigation_id: str) -> dict[str, Any] | None:
        raw = await self._redis.get(_driver_key(investigation_id))
        return json.loads(raw) if raw else None

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
