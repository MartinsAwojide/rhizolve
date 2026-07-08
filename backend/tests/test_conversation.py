from unittest.mock import AsyncMock

import pytest

from agent.conversation import ConversationalAgent
from core.llm import get_llm_client


@pytest.mark.asyncio
async def test_shallow_does_not_invoke_graph():
    mock_graph = AsyncMock()
    agent = ConversationalAgent(llm_client=get_llm_client(), graph=mock_graph)

    result = await agent.handle("What is 5 Whys?", mode="shallow")

    assert result["graph_invoked"] is False
    assert isinstance(result["response"], str)
    assert len(result["response"]) > 0
    mock_graph.ainvoke.assert_not_called()


@pytest.mark.asyncio
async def test_deep_invokes_graph():
    mock_graph = AsyncMock()
    agent = ConversationalAgent(llm_client=get_llm_client(), graph=mock_graph)

    result = await agent.handle("Trucks keep hitting the loading-bay walls", mode="deep")

    assert result["graph_invoked"] is True
    mock_graph.ainvoke.assert_called_once()
