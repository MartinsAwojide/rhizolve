import json
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as redis


def make_channel(project_id: str, investigation_id: str) -> str:
    return f"stream:{project_id}:{investigation_id}"


class RedisPubSub:
    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client

    async def publish(
        self, channel: str, event_type: str, payload: dict[str, Any]
    ) -> None:
        message = json.dumps({"type": event_type, "payload": payload})
        await self._redis.publish(channel, message)

    async def subscribe(self, channel: str) -> AsyncIterator[dict[str, Any]]:
        pubsub = self._redis.pubsub()
        try:
            await pubsub.subscribe(channel)
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                yield json.loads(message["data"])
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
