import json
from typing import Any, cast

from openai import APIConnectionError, InternalServerError, RateLimitError
from openai.types.chat import ChatCompletionMessageParam
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from agent.schemas import ExtractionOutput
from core.config import OPENROUTER_MODEL
from core.llm import get_llm_client

_SYSTEM_PROMPT = (
    "Extract investigation parameters from the conversation: phenomenon "
    "(what is going wrong), domain (industry/field), and "
    "system_or_process_context (the specific system, line, or process "
    "involved). Respond with ONLY a JSON object, no other text, matching "
    'this shape: {"phenomenon": string|null, "domain": string|null, '
    '"system_or_process_context": string|null, "confidence": '
    '{"phenomenon": float, "domain": float, "system_or_process_context": '
    "float}}. Confidence is 0.0-1.0 per field, reflecting how certain the "
    "extraction is; use 0.0 for any field you could not extract."
)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, RateLimitError, InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(3),
)
async def extract_investigation_params(
    conversation_history: list[dict[str, Any]],
) -> dict[str, Any]:
    llm_client = get_llm_client()
    messages = cast(
        list[ChatCompletionMessageParam],
        [{"role": "system", "content": _SYSTEM_PROMPT}, *conversation_history],
    )
    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=messages,
    )
    content = (completion.choices[0].message.content or "{}").strip()
    content = (
        content.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    )
    output = ExtractionOutput.model_validate(json.loads(content))
    return output.model_dump()


_FIELD_ORDER = ("phenomenon", "domain", "system_or_process_context")

_FIELD_QUESTIONS = {
    "phenomenon": "What exactly is going wrong?",
    "domain": "What industry or domain is this in?",
    "system_or_process_context": "Which system, line, or process is involved?",
}


def fields_needing_confirmation(
    params: dict[str, Any], threshold: float = 0.7
) -> list[str]:
    confidence = params.get("confidence", {})
    return [field for field in _FIELD_ORDER if confidence.get(field, 0.0) < threshold]


def build_missing_fields_prompt(missing_fields: list[str]) -> str | None:
    if not missing_fields:
        return None
    return " ".join(_FIELD_QUESTIONS[field] for field in missing_fields)
