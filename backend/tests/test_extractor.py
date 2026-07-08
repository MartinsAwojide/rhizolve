import pytest

from agent.extractor import extract_investigation_params


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
