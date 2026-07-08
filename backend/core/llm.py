from openai import AsyncOpenAI

from core.config import OPENROUTER_API_KEY


def get_llm_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
