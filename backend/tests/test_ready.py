import uuid

import pytest
import redis.asyncio as redis

from core.config import REDIS_URL
from core.ready import ReadyTracker


@pytest.fixture
async def redis_client():
    client = redis.from_url(REDIS_URL)
    yield client
    await client.aclose()


@pytest.fixture
def tracker(redis_client):
    return ReadyTracker(redis_client)


def _inv() -> str:
    return f"inv-{uuid.uuid4()}"


@pytest.mark.asyncio
async def test_toggle_flips_ready_state(tracker):
    inv = _inv()
    first = await tracker.toggle(inv, "user-1")
    assert first is True
    second = await tracker.toggle(inv, "user-1")
    assert second is False
    third = await tracker.toggle(inv, "user-1")
    assert third is True


@pytest.mark.asyncio
async def test_get_ready_ids_starts_empty(tracker):
    ids = await tracker.get_ready_ids(_inv())
    assert ids == set()


@pytest.mark.asyncio
async def test_get_ready_ids_reflects_toggles(tracker):
    inv = _inv()
    await tracker.toggle(inv, "user-1")
    await tracker.toggle(inv, "user-2")
    ids = await tracker.get_ready_ids(inv)
    assert ids == {"user-1", "user-2"}


@pytest.mark.asyncio
async def test_get_ready_ids_excludes_toggled_off_users(tracker):
    inv = _inv()
    await tracker.toggle(inv, "user-1")
    await tracker.toggle(inv, "user-2")
    await tracker.toggle(inv, "user-1")  # un-ready user-1
    ids = await tracker.get_ready_ids(inv)
    assert ids == {"user-2"}


@pytest.mark.asyncio
async def test_ready_key_has_no_ttl(tracker, redis_client):
    inv = _inv()
    await tracker.toggle(inv, "user-1")
    ttl = await redis_client.ttl(f"ready:{inv}:user-1")
    assert ttl == -1
