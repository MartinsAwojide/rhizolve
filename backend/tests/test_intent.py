import pytest

from agent.intent import classify_intent
from core.llm import get_llm_client


@pytest.mark.asyncio
async def test_classifies_general_question_as_shallow():
    result = await classify_intent("What is 5 Whys?", get_llm_client())
    assert result == "shallow"


@pytest.mark.asyncio
async def test_classifies_problem_description_as_deep():
    result = await classify_intent(
        "Trucks keep hitting the loading-bay walls, help me find out why",
        get_llm_client(),
    )
    assert result == "deep"
