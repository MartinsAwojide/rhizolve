import asyncio

import pytest
import redis.asyncio as redis

from core.config import REDIS_URL
from core.pubsub import RedisPubSub, make_channel


@pytest.fixture
async def redis_client():
    client = redis.from_url(REDIS_URL)
    yield client
    await client.aclose()


@pytest.fixture
def pubsub(redis_client):
    return RedisPubSub(redis_client)


async def _first_event(pubsub: RedisPubSub, channel: str, timeout: float = 2.0):
    gen = pubsub.subscribe(channel)
    return await asyncio.wait_for(gen.__anext__(), timeout=timeout)


@pytest.mark.asyncio
async def test_publish_then_subscribe_receives_event(pubsub):
    channel = make_channel("proj-1", "inv-1")

    async def publisher():
        await asyncio.sleep(0.2)
        await pubsub.publish(channel, "node_update", {"node": "intake"})

    task = asyncio.create_task(publisher())
    event = await _first_event(pubsub, channel)
    await task

    assert event == {"type": "node_update", "payload": {"node": "intake"}}


@pytest.mark.asyncio
async def test_subscribe_only_receives_events_on_its_own_channel(pubsub):
    channel_a = make_channel("proj-1", "inv-a")
    channel_b = make_channel("proj-1", "inv-b")

    async def publisher():
        await asyncio.sleep(0.2)
        await pubsub.publish(channel_b, "node_update", {"node": "intake"})
        await pubsub.publish(channel_a, "node_update", {"node": "why_generator"})

    task = asyncio.create_task(publisher())
    event = await _first_event(pubsub, channel_a)
    await task

    assert event == {"type": "node_update", "payload": {"node": "why_generator"}}


@pytest.mark.asyncio
async def test_multiple_subscribers_all_receive(pubsub):
    channel = make_channel("proj-1", "inv-fanout")

    async def publisher():
        await asyncio.sleep(0.2)
        await pubsub.publish(channel, "node_update", {"node": "intake"})

    task = asyncio.create_task(publisher())
    event_1, event_2 = await asyncio.gather(
        _first_event(pubsub, channel), _first_event(pubsub, channel)
    )
    await task

    assert event_1 == {"type": "node_update", "payload": {"node": "intake"}}
    assert event_2 == {"type": "node_update", "payload": {"node": "intake"}}
