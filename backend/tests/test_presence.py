import asyncio

import pytest
import redis.asyncio as redis

from core.config import REDIS_URL
from core.presence import PresenceTracker


@pytest.fixture
async def redis_client():
    client = redis.from_url(REDIS_URL)
    yield client
    await client.aclose()


@pytest.fixture
def tracker(redis_client):
    return PresenceTracker(redis_client, ttl_seconds=1)


@pytest.mark.asyncio
async def test_heartbeat_creates_presence_key_with_ttl(tracker, redis_client):
    result = await tracker.heartbeat("inv-1", "user-1", "Alice")
    assert result["is_new"] is True
    assert result["snapshot"] == [
        {"user_id": "user-1", "name": "Alice", "editing": False, "editing_node": None}
    ]
    ttl = await redis_client.ttl("presence:inv-1:user-1")
    assert 0 < ttl <= 1


@pytest.mark.asyncio
async def test_heartbeat_refreshes_ttl_on_repeat_call(tracker, redis_client):
    await tracker.heartbeat("inv-2", "user-1", "Alice")
    await asyncio.sleep(0.5)
    result = await tracker.heartbeat("inv-2", "user-1", "Alice")
    assert result["is_new"] is False
    ttl = await redis_client.ttl("presence:inv-2:user-1")
    assert ttl > 0.4


@pytest.mark.asyncio
async def test_list_active_excludes_expired(tracker):
    await tracker.heartbeat("inv-3", "user-1", "Alice")
    await asyncio.sleep(1.3)
    active = await tracker.list_active("inv-3")
    assert active == []


@pytest.mark.asyncio
async def test_heartbeat_detects_editing_change(tracker):
    await tracker.heartbeat("inv-4", "user-1", "Alice", editing=False)
    result = await tracker.heartbeat(
        "inv-4", "user-1", "Alice", editing=True, editing_node="root.h1"
    )
    assert result["editing_changed"] is True
    assert result["snapshot"][0]["editing"] is True
    assert result["snapshot"][0]["editing_node"] == "root.h1"


@pytest.mark.asyncio
async def test_heartbeat_editing_unchanged_not_flagged(tracker):
    await tracker.heartbeat(
        "inv-5", "user-1", "Alice", editing=True, editing_node="root.h1"
    )
    result = await tracker.heartbeat(
        "inv-5", "user-1", "Alice", editing=True, editing_node="root.h1"
    )
    assert result["editing_changed"] is False


@pytest.mark.asyncio
async def test_is_new_true_only_on_first_call(tracker):
    first = await tracker.heartbeat("inv-6", "user-1", "Alice")
    second = await tracker.heartbeat("inv-6", "user-1", "Alice")
    assert first["is_new"] is True
    assert second["is_new"] is False
