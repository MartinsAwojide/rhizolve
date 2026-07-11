import asyncio
import uuid

import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from api.stream import stream_investigation
from core.memory import make_checkpointer
from core.pubsub import RedisPubSub


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
async def stream_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _pinned_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    pubsub = RedisPubSub(app.state.redis)
    agent = FiveWhysAgent(checkpointer, pubsub=pubsub)
    app.state.five_whys_agent = agent
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
        await ctx.__aexit__(None, None, None)


async def _create_project(authed_client) -> str:
    r = await authed_client.post(
        "/api/v1/projects", json={"name": "Test", "visibility": "private"}
    )
    return r.json()["id"]


async def _start_investigation(agent, project_id: str) -> str:
    started = await agent.start_investigation(
        phenomenon="Glue overflowed",
        domain="manufacturing",
        system_or_process_context="glue tank fill station, line 3",
        project_id=project_id,
    )
    return started["investigation_id"]


# httpx's ASGITransport (used by authed_client/async_client) is not a real
# streaming transport: it awaits the whole ASGI app() coroutine to completion,
# buffering every send() into memory, before returning any Response. An
# intentionally-infinite SSE generator can never let app() return, so it
# deadlocks under httpx.stream() no matter how the endpoint checks for
# disconnects. These two tests call the route function directly and drive its
# StreamingResponse.body_iterator by hand instead of going through httpx.
class _FakeRequest:
    def __init__(self, app):
        self.app = app

    async def is_disconnected(self) -> bool:
        return False


@pytest.mark.asyncio
async def test_stream_returns_text_event_stream_content_type(authed_client, stream_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(stream_env, project_id)

    response = await stream_investigation(
        project_id, investigation_id, _FakeRequest(app), _member=None
    )
    try:
        assert response.media_type == "text/event-stream"
        assert response.headers["cache-control"] == "no-cache"
    finally:
        await response.body_iterator.aclose()


@pytest.mark.asyncio
async def test_stream_delivers_event_within_3s_of_publish(authed_client, stream_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(stream_env, project_id)

    response = await stream_investigation(
        project_id, investigation_id, _FakeRequest(app), _member=None
    )
    try:
        first = asyncio.ensure_future(response.body_iterator.__anext__())
        await asyncio.sleep(0.3)  # let the SUBSCRIBE land before publishing

        await stream_env.submit_gemba(investigation_id, "NOK", notes="seal cracked")

        chunk = await asyncio.wait_for(first, timeout=3.0)
        assert chunk.startswith("data:")
        assert "node_update" in chunk
    finally:
        await response.body_iterator.aclose()


@pytest.mark.asyncio
async def test_stream_non_member_403(authed_client, monkeypatch, stream_env):
    project_id = await _create_project(authed_client)
    investigation_id = await _start_investigation(stream_env, project_id)

    # Re-authenticate the shared client as a brand-new user who was never
    # added as a ProjectMember (authed_client and async_client are the same
    # object, so simply reusing async_client would still carry the owner's
    # auth from _create_project above).
    stranger_id = f"clerk_user_{uuid.uuid4()}"

    async def _payload(request):
        return {"sub": stranger_id, "email": f"{stranger_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    authed_client.headers["Authorization"] = f"Bearer {stranger_id}"
    await authed_client.post("/api/v1/auth/sync")

    url = f"/api/v1/projects/{project_id}/investigations/{investigation_id}/stream"
    r = await authed_client.get(url)
    assert r.status_code == 403
