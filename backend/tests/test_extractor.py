import pytest

from agent.extractor import (
    build_missing_fields_prompt,
    extract_investigation_params,
    fields_needing_confirmation,
)


@pytest.mark.asyncio
async def test_extracts_phenomenon_from_conversation(mock_llm):
    history = [{"role": "user", "content": "Our glue tank keeps overflowing on line 3"}]
    params = await extract_investigation_params(history)
    assert params["confidence"]["phenomenon"] > 0.7


@pytest.mark.asyncio
async def test_extracts_phenomenon_from_real_llm():
    history = [
        {
            "role": "user",
            "content": (
                "Our packaging line keeps jamming at the sealer station "
                "every time we run the new box size"
            ),
        }
    ]
    params = await extract_investigation_params(history)
    assert isinstance(params["phenomenon"], str)
    assert len(params["phenomenon"]) > 0
    assert params["confidence"]["phenomenon"] > 0.5


def test_all_fields_above_threshold_returns_empty():
    params = {
        "confidence": {
            "phenomenon": 0.9,
            "domain": 0.8,
            "system_or_process_context": 0.75,
        }
    }
    assert fields_needing_confirmation(params) == []


def test_low_confidence_fields_are_flagged():
    params = {
        "confidence": {
            "phenomenon": 0.9,
            "domain": 0.3,
            "system_or_process_context": 0.5,
        }
    }
    assert fields_needing_confirmation(params) == [
        "domain",
        "system_or_process_context",
    ]


def test_prompt_asks_only_for_missing_fields():
    prompt = build_missing_fields_prompt(["domain"])
    assert prompt is not None
    assert "industry or domain" in prompt
    assert "going wrong" not in prompt
    assert "system, line, or process" not in prompt


def test_prompt_is_none_when_nothing_missing():
    assert build_missing_fields_prompt([]) is None
