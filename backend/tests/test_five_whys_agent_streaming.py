import asyncio
import uuid

import pytest
import redis.asyncio as redis

from agent.five_whys_agent import FiveWhysAgent
from core.config import REDIS_URL
from core.memory import make_checkpointer
from core.pubsub import RedisPubSub, make_channel


async def _pinned_why_generator(state):
    return {
        "pending_hypotheses": [
            {
                "hypothesis": "seal wear on the fill valve",
                "branch_path": f"{state['current_branch_path']}.h1",
                "depth": state["current_depth"],
                "gemba_instructions": "inspect fill valve seal",
            }
        ]
    }


@pytest.fixture
async def redis_client():
    client = redis.from_url(REDIS_URL)
    yield client
    await client.aclose()


@pytest.fixture
async def agent(monkeypatch, redis_client):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    pubsub = RedisPubSub(redis_client)
    a = FiveWhysAgent(checkpointer, pubsub=pubsub)
    try:
        yield a
    finally:
        await ctx.__aexit__(None, None, None)


async def _collect_until(
    pubsub: RedisPubSub, channel: str, at_least: int, timeout: float
):
    events: list[dict] = []
    gen = pubsub.subscribe(channel)
    try:
        async with asyncio.timeout(timeout):
            async for event in gen:
                events.append(event)
                if len(events) >= at_least:
                    break
    except TimeoutError:
        pass
    return events


@pytest.mark.asyncio
async def test_start_investigation_publishes_node_update_events(
    agent, redis_client, monkeypatch
):
    fixed_id = str(uuid.uuid4())
    monkeypatch.setattr("agent.five_whys_agent.uuid.uuid4", lambda: fixed_id)
    channel = make_channel("proj-stream-1", fixed_id)
    pubsub = RedisPubSub(redis_client)

    reader = asyncio.create_task(
        _collect_until(pubsub, channel, at_least=1, timeout=3.0)
    )
    await asyncio.sleep(0.2)

    result = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-stream-1",
    )

    events = await reader
    assert result["investigation_id"] == fixed_id
    assert len(events) >= 1
    assert all(e["type"] == "node_update" for e in events)
    assert all(e["payload"]["investigation_id"] == fixed_id for e in events)


@pytest.mark.asyncio
async def test_submit_gemba_publishes_node_update_and_preserves_status(
    agent, redis_client
):
    result = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id="proj-stream-2",
    )
    investigation_id = result["investigation_id"]
    channel = make_channel("proj-stream-2", investigation_id)
    pubsub = RedisPubSub(redis_client)

    reader = asyncio.create_task(
        _collect_until(pubsub, channel, at_least=1, timeout=3.0)
    )
    await asyncio.sleep(0.2)

    status = await agent.submit_gemba(investigation_id, "NOK", notes="seal cracked")

    events = await reader
    assert status["status"] == "awaiting_gemba"
    assert len(events) >= 1
    assert all(e["type"] == "node_update" for e in events)
