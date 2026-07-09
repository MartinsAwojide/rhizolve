import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from agent.graph import why_generator
from agent.tools import lookup_wikipedia, search_failure_modes


def _base_state(**overrides):
    state = {
        "investigation_id": "inv-001",
        "project_id": "proj-001",
        "phenomenon": "Glue tank overflowed on line 3",
        "domain": "manufacturing",
        "system_or_process_context": "glue tank fill station, line 3",
        "max_depth": 5,
        "current_depth": 1,
        "current_branch_path": "root",
        "why_nodes": [],
        "pending_hypotheses": [],
    }
    state.update(overrides)
    return state


@pytest.mark.asyncio
async def test_why_generator_returns_branch_positioned_pending_hypotheses():
    state = _base_state()
    result = await why_generator(state)

    assert "pending_hypotheses" in result
    hypotheses = result["pending_hypotheses"]
    assert len(hypotheses) > 0

    for i, hypothesis in enumerate(hypotheses):
        assert hypothesis["branch_path"] == f"root.h{i + 1}"
        assert hypothesis["depth"] == 1
        assert hypothesis["hypothesis"]
        assert hypothesis["gemba_instructions"]


@pytest.mark.asyncio
async def test_why_generator_positions_deeper_branch_from_active_hypothesis():
    state = _base_state(
        current_depth=2,
        current_branch_path="root.h1",
        active_hypothesis={
            "hypothesis": "seal wear on the fill valve",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "inspect fill valve seal",
        },
    )
    result = await why_generator(state)

    hypotheses = result["pending_hypotheses"]
    assert len(hypotheses) > 0
    for i, hypothesis in enumerate(hypotheses):
        assert hypothesis["branch_path"] == f"root.h1.h{i + 1}"
        assert hypothesis["depth"] == 2


@pytest.mark.asyncio
async def test_search_failure_modes_returns_live_results():
    results = await search_failure_modes("glue tank overflow manufacturing")
    assert isinstance(results, list)
    assert len(results) > 0
    assert results[0]["title"]


@pytest.mark.asyncio
async def test_lookup_wikipedia_returns_live_summary():
    result = await lookup_wikipedia("Glue")
    assert result["title"]
    assert result["extract"]


@pytest.mark.asyncio
async def test_why_generator_executes_tool_call_round_trip(monkeypatch):
    mock_llm_client = AsyncMock()

    tool_call = MagicMock()
    tool_call.id = "call_1"
    tool_call.function.name = "lookup_wikipedia"
    tool_call.function.arguments = json.dumps({"query": "glue viscosity"})

    first_response = MagicMock()
    first_response.choices = [
        MagicMock(message=MagicMock(content=None, tool_calls=[tool_call]))
    ]

    second_response = MagicMock()
    second_response.choices = [
        MagicMock(message=MagicMock(content="looked it up", tool_calls=None))
    ]

    final_response = MagicMock()
    final_response.choices = [
        MagicMock(
            message=MagicMock(
                content=json.dumps(
                    [
                        {
                            "hypothesis": "adhesive viscosity too low",
                            "gemba_instructions": "check adhesive batch viscosity log",
                        }
                    ]
                ),
                tool_calls=None,
            )
        )
    ]

    mock_llm_client.chat.completions.create = AsyncMock(
        side_effect=[first_response, second_response, final_response]
    )
    monkeypatch.setattr("agent.graph.get_llm_client", lambda: mock_llm_client)

    mock_tool_fn = AsyncMock(return_value={"title": "Glue", "extract": "sticky stuff"})
    monkeypatch.setattr(
        "agent.graph.TOOL_FUNCTIONS", {"lookup_wikipedia": mock_tool_fn}
    )

    state = _base_state()
    result = await why_generator(state)

    mock_tool_fn.assert_called_once_with(query="glue viscosity")
    assert mock_llm_client.chat.completions.create.call_count == 3
    assert result["pending_hypotheses"] == [
        {
            "hypothesis": "adhesive viscosity too low",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "check adhesive batch viscosity log",
        }
    ]
