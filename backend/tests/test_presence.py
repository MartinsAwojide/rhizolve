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
    result = await tracker.heartbeat("inv-1", "user-1", "Alice", role="owner")
    assert result["is_new"] is True
    snapshot = result["snapshot"]
    assert len(snapshot) == 1
    assert snapshot[0]["user_id"] == "user-1"
    assert snapshot[0]["name"] == "Alice"
    assert snapshot[0]["role"] == "owner"
    assert snapshot[0]["editing"] is False
    assert snapshot[0]["editing_node"] is None
    assert "joined_at" in snapshot[0]
    ttl = await redis_client.ttl("presence:inv-1:user-1")
    assert 0 < ttl <= 1


@pytest.mark.asyncio
async def test_heartbeat_refreshes_ttl_on_repeat_call(tracker, redis_client):
    await tracker.heartbeat("inv-2", "user-1", "Alice", role="owner")
    await asyncio.sleep(0.5)
    result = await tracker.heartbeat("inv-2", "user-1", "Alice", role="owner")
    assert result["is_new"] is False
    ttl = await redis_client.ttl("presence:inv-2:user-1")
    assert ttl > 0.4


@pytest.mark.asyncio
async def test_list_active_excludes_expired(tracker):
    await tracker.heartbeat("inv-3", "user-1", "Alice", role="owner")
    await asyncio.sleep(1.3)
    active = await tracker.list_active("inv-3")
    assert active == []


@pytest.mark.asyncio
async def test_heartbeat_detects_editing_change(tracker):
    await tracker.heartbeat("inv-4", "user-1", "Alice", role="owner", editing=False)
    result = await tracker.heartbeat(
        "inv-4", "user-1", "Alice", role="owner", editing=True, editing_node="root.h1"
    )
    assert result["editing_changed"] is True
    assert result["snapshot"][0]["editing"] is True
    assert result["snapshot"][0]["editing_node"] == "root.h1"


@pytest.mark.asyncio
async def test_heartbeat_editing_unchanged_not_flagged(tracker):
    await tracker.heartbeat(
        "inv-5", "user-1", "Alice", role="owner", editing=True, editing_node="root.h1"
    )
    result = await tracker.heartbeat(
        "inv-5", "user-1", "Alice", role="owner", editing=True, editing_node="root.h1"
    )
    assert result["editing_changed"] is False


@pytest.mark.asyncio
async def test_is_new_true_only_on_first_call(tracker):
    first = await tracker.heartbeat("inv-6", "user-1", "Alice", role="owner")
    second = await tracker.heartbeat("inv-6", "user-1", "Alice", role="owner")
    assert first["is_new"] is True
    assert second["is_new"] is False


@pytest.mark.asyncio
async def test_joined_at_preserved_across_heartbeats(tracker):
    first = await tracker.heartbeat("inv-7", "user-1", "Alice", role="owner")
    second = await tracker.heartbeat("inv-7", "user-1", "Alice", role="owner")
    assert first["snapshot"][0]["joined_at"] == second["snapshot"][0]["joined_at"]


@pytest.mark.asyncio
async def test_heartbeat_returns_driver_and_driver_changed_on_first_join(tracker):
    result = await tracker.heartbeat("inv-8", "user-1", "Alice", role="owner")
    assert result["driver"]["user_id"] == "user-1"
    assert result["driver_changed"] is True


@pytest.mark.asyncio
async def test_heartbeat_no_driver_change_when_same_driver_reheartbeats(tracker):
    await tracker.heartbeat("inv-9", "user-1", "Alice", role="owner")
    result = await tracker.heartbeat("inv-9", "user-1", "Alice", role="owner")
    assert result["driver_changed"] is False
    assert result["driver"]["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_driver_transfers_when_more_senior_participant_joins(tracker):
    await tracker.heartbeat("inv-10", "user-a", "A", role="contributor")
    result = await tracker.heartbeat("inv-10", "user-b", "B", role="owner")
    assert result["driver_changed"] is True
    assert result["driver"]["user_id"] == "user-b"


@pytest.mark.asyncio
async def test_get_driver_returns_none_when_no_participants(tracker):
    driver = await tracker.get_driver("inv-nonexistent")
    assert driver is None


@pytest.mark.asyncio
async def test_driver_transfers_when_current_driver_heartbeat_lapses(tracker):
    # Owner (A) and contributor (B) both join — A outranks B, becomes driver.
    await tracker.heartbeat("inv-11", "user-a", "A", role="owner")
    await tracker.heartbeat("inv-11", "user-b", "B", role="contributor")

    # A goes silent (stops heartbeating) and its presence key expires past
    # the tracker's TTL, while B keeps heartbeating.
    await asyncio.sleep(1.3)

    result = await tracker.heartbeat("inv-11", "user-b", "B", role="contributor")
    assert result["driver_changed"] is True
    assert result["driver"]["user_id"] == "user-b"
