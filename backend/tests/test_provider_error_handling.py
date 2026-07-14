import httpx
import openai
import pytest

from agent.five_whys_agent import FiveWhysAgent
from api.main import app
from core.memory import make_checkpointer


def _openai_402_error() -> openai.APIStatusError:
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    response = httpx.Response(402, request=request, json={"error": {"message": "no credits"}})
    return openai.APIStatusError("no credits", response=response, body=None)


async def _failing_why_generator(state):
    raise _openai_402_error()


@pytest.fixture
async def provider_error_env(monkeypatch):
    monkeypatch.setattr("agent.graph.why_generator", _failing_why_generator)
    checkpointer, ctx = await make_checkpointer()
    original_agent = app.state.five_whys_agent
    agent = FiveWhysAgent(checkpointer)
    app.state.five_whys_agent = agent
    try:
        yield agent
    finally:
        app.state.five_whys_agent = original_agent
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_llm_provider_error_returns_clean_503_not_raw_500(
    async_client, provider_error_env, mock_llm
):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "Glue tank overflowing on line 3",
            "mode": "deep",
            "action": "start_investigation",
            "project_id": "proj-provider-error",
        },
    )

    assert r.status_code == 503
    assert r.json() == {
        "detail": "AI service temporarily unavailable. Please try again shortly."
    }
