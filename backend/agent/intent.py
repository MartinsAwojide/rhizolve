from typing import Literal

from openai import APIConnectionError, AsyncOpenAI, InternalServerError, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from core.config import OPENROUTER_MODEL

Intent = Literal["shallow", "deep"]

_SYSTEM_PROMPT = (
    "Classify the user's message as exactly one word: 'shallow' or 'deep'. "
    "'deep' means the user describes a specific problem/defect/failure they "
    "want investigated (a root-cause investigation). 'shallow' means a "
    "general question, request for information, or anything else. "
    "Respond with only the single word."
)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, RateLimitError, InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(3),
)
async def classify_intent(message: str, llm_client: AsyncOpenAI) -> Intent:
    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    )
    content = (completion.choices[0].message.content or "").strip().lower()
    return "deep" if "deep" in content else "shallow"
