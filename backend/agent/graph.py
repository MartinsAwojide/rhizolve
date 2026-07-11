import json
import uuid
from pathlib import Path
from typing import Annotated, Any, Literal, NotRequired, TypedDict, cast

from langgraph.graph import StateGraph
from openai import APIConnectionError, InternalServerError, RateLimitError
from openai.types.chat import (
    ChatCompletionFunctionToolParam,
    ChatCompletionMessageFunctionToolCall,
    ChatCompletionMessageParam,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from agent.tools import TOOL_FUNCTIONS, TOOL_SCHEMAS
from core.config import INVESTIGATIONS_DIR, OPENROUTER_MODEL
from core.llm import get_llm_client


class Attachment(TypedDict):
    id: str
    type: Literal["image", "audio"]
    url: str
    filename: str
    content_type: str
    transcription: NotRequired[str]
    transcription_status: NotRequired[Literal["pending", "complete", "unavailable"]]


class WhyNode(TypedDict):
    id: str
    branch_path: str
    depth: int
    hypothesis: str
    gemba_result: Literal["OK", "NOK", "ROOT_CAUSE", "pending"]
    gemba_notes: str
    is_root_cause: bool
    countermeasure: str
    status: NotRequired[Literal["active", "closed", "suspended", "deleted"]]
    model_attribution: NotRequired[str]
    attachments: NotRequired[list[Attachment]]


class PendingHypothesis(TypedDict):
    hypothesis: str
    branch_path: str
    depth: int
    gemba_instructions: str
    domain_context: NotRequired[str]


def _merge_why_nodes(existing: list[WhyNode], update: list[WhyNode]) -> list[WhyNode]:
    merged = {node["id"]: node for node in existing}
    for node in update:
        merged[node["id"]] = node
    return list(merged.values())


class OverallState(TypedDict):
    investigation_id: str
    project_id: str
    phenomenon: str
    domain: str
    system_or_process_context: str
    max_depth: int
    current_depth: int
    current_branch_path: str
    why_nodes: Annotated[list[WhyNode], _merge_why_nodes]
    pending_hypotheses: list[PendingHypothesis]
    domain_context: NotRequired[str]
    active_hypothesis: NotRequired[PendingHypothesis | None]
    report_path: NotRequired[str]
    maturity_level: NotRequired[int]
    transferred_from: NotRequired[Literal["langgraph", "koog"] | None]
    transferred_at: NotRequired[str | None]


async def intake(state: OverallState) -> dict[str, Any]:
    return {
        "current_depth": 1,
        "current_branch_path": "root",
        "why_nodes": [],
        "pending_hypotheses": [],
    }


_WHY_GENERATOR_SYSTEM_PROMPT = (
    "You are conducting a 5 Whys root cause investigation. Given the "
    "phenomenon and context below, propose plausible hypotheses for why it "
    "is happening at the current branch. You may call the provided search "
    "and lookup tools to ground your hypotheses in real failure modes, "
    "recent incidents, or engineering references before answering. When "
    "you are ready to answer, respond with ONLY a JSON array, no other "
    'text, of objects matching this shape: [{"hypothesis": string, '
    '"gemba_instructions": string}]. "gemba_instructions" is a concrete '
    "instruction for what to physically check/observe (Gemba walk) to "
    "verify or refute the hypothesis."
)


def _strip_fences(content: str) -> str:
    return (
        content.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )


def _why_generator_user_prompt(state: OverallState) -> str:
    lines = [
        f"Phenomenon: {state['phenomenon']}",
        f"Domain: {state['domain']}",
        f"System/process context: {state['system_or_process_context']}",
        f"Current branch: {state['current_branch_path']}",
    ]
    active = state.get("active_hypothesis")
    if active is not None:
        lines.append(f"Drilling deeper into hypothesis: {active['hypothesis']}")
    domain_context = state.get("domain_context")
    if domain_context:
        lines.append(f"Additional context: {domain_context}")
    return "\n".join(lines)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, RateLimitError, InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(3),
)
async def why_generator(state: OverallState) -> dict[str, Any]:
    llm_client = get_llm_client()
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": _WHY_GENERATOR_SYSTEM_PROMPT},
        {"role": "user", "content": _why_generator_user_prompt(state)},
    ]

    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=cast(list[ChatCompletionMessageParam], messages),
        tools=cast(list[ChatCompletionFunctionToolParam], TOOL_SCHEMAS),
    )
    message = completion.choices[0].message

    while message.tool_calls:
        tool_calls = cast(
            list[ChatCompletionMessageFunctionToolCall], message.tool_calls
        )
        messages.append(
            {
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in tool_calls
                ],
            }
        )
        for call in tool_calls:
            tool_fn = TOOL_FUNCTIONS[call.function.name]
            args = json.loads(call.function.arguments or "{}")
            result = await tool_fn(**args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result),
                }
            )
        completion = await llm_client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=cast(list[ChatCompletionMessageParam], messages),
            tools=cast(list[ChatCompletionFunctionToolParam], TOOL_SCHEMAS),
        )
        message = completion.choices[0].message

    messages.append({"role": "assistant", "content": message.content})
    messages.append(
        {
            "role": "user",
            "content": (
                "Respond with ONLY the JSON array now, no other text, no "
                "markdown fences, matching the shape given earlier."
            ),
        }
    )
    final_completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=cast(list[ChatCompletionMessageParam], messages),
    )
    content = _strip_fences(final_completion.choices[0].message.content or "[]")
    hypotheses = json.loads(content)

    active = state.get("active_hypothesis")
    if active is not None:
        branch_prefix = active["branch_path"]
        depth = active["depth"] + 1
    else:
        branch_prefix = state["current_branch_path"]
        depth = state["current_depth"]

    pending_hypotheses: list[PendingHypothesis] = [
        {
            "hypothesis": item["hypothesis"],
            "branch_path": f"{branch_prefix}.h{i + 1}",
            "depth": depth,
            "gemba_instructions": item["gemba_instructions"],
        }
        for i, item in enumerate(hypotheses)
    ]

    return {"pending_hypotheses": pending_hypotheses}


async def gemba_dispatcher(state: OverallState) -> dict[str, Any]:
    pending = state["pending_hypotheses"]
    next_hypothesis = pending[0]
    new_node: WhyNode = {
        "id": str(uuid.uuid4()),
        "branch_path": next_hypothesis["branch_path"],
        "depth": next_hypothesis["depth"],
        "hypothesis": next_hypothesis["hypothesis"],
        "gemba_result": "pending",
        "gemba_notes": "",
        "is_root_cause": False,
        "countermeasure": "",
    }
    return {
        "active_hypothesis": next_hypothesis,
        "pending_hypotheses": pending[1:],
        "why_nodes": [new_node],
    }


async def gemba_check(state: OverallState) -> dict[str, Any]:
    return {}


_ROOT_CAUSE_VALIDATOR_SYSTEM_PROMPT = (
    'Respond with ONLY a JSON object: {"is_root_cause": bool, "reasoning": '
    "string}. is_root_cause is true only if this hypothesis represents a "
    "fundamental, actionable root cause with no further meaningful "
    '"why" behind it.'
)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, RateLimitError, InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(3),
)
async def root_cause_validator(state: OverallState) -> dict[str, Any]:
    active = state.get("active_hypothesis")
    if active is None:
        return {}
    why_node = _find_why_node(state, active["branch_path"])
    assert why_node is not None

    llm_client = get_llm_client()
    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=cast(
            list[ChatCompletionMessageParam],
            [
                {"role": "system", "content": _ROOT_CAUSE_VALIDATOR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Phenomenon: {state['phenomenon']}\n"
                        f"Hypothesis: {why_node['hypothesis']}\n"
                        f"Gemba result: {why_node['gemba_result']}\n"
                        f"Gemba notes: {why_node['gemba_notes']}"
                    ),
                },
            ],
        ),
    )
    content = _strip_fences(completion.choices[0].message.content or "{}")
    verdict = json.loads(content)
    updated_node: WhyNode = {**why_node, "is_root_cause": verdict["is_root_cause"]}

    return {
        "why_nodes": [updated_node],
        "current_depth": why_node["depth"],
        "current_branch_path": why_node["branch_path"],
    }


_COUNTERMEASURE_SYSTEM_PROMPT = (
    'Respond with ONLY a JSON object: {"countermeasure": string}. Propose a '
    "concrete, actionable countermeasure that addresses this hypothesis. It "
    "may or may not be a confirmed root cause (max investigation depth may "
    "have been reached first) — word the countermeasure appropriately "
    "either way, don't assert unwarranted certainty."
)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, RateLimitError, InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(3),
)
async def countermeasure_generator(state: OverallState) -> dict[str, Any]:
    active = state.get("active_hypothesis")
    if active is None:
        return {}
    why_node = _find_why_node(state, active["branch_path"])
    assert why_node is not None

    llm_client = get_llm_client()
    completion = await llm_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=cast(
            list[ChatCompletionMessageParam],
            [
                {"role": "system", "content": _COUNTERMEASURE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Phenomenon: {state['phenomenon']}\n"
                        f"Hypothesis: {why_node['hypothesis']}"
                        + (
                            f"\nAdditional context: {state['domain_context']}"
                            if state.get("domain_context")
                            else ""
                        )
                    ),
                },
            ],
        ),
    )
    content = _strip_fences(completion.choices[0].message.content or "{}")
    countermeasure = json.loads(content)["countermeasure"]
    updated_node: WhyNode = {**why_node, "countermeasure": countermeasure}
    return {"why_nodes": [updated_node]}


def _build_report_markdown(state: OverallState) -> str:
    lines = [
        f"# Investigation Report: {state['phenomenon']}",
        "",
        f"**Domain:** {state['domain']}",
        f"**System/process context:** {state['system_or_process_context']}",
        "",
        "## Why Tree",
        "",
    ]
    sorted_nodes = sorted(
        (n for n in state["why_nodes"] if n.get("status", "active") != "deleted"),
        key=lambda n: n["branch_path"],
    )
    for node in sorted_nodes:
        marker = " (ROOT CAUSE)" if node["is_root_cause"] else ""
        suspended_note = (
            " (SUSPENDED — superseded by later evidence)"
            if node.get("status") == "suspended"
            else ""
        )
        lines.append(
            f"- **{node['branch_path']}** (depth {node['depth']}): "
            f"{node['hypothesis']}{marker}{suspended_note}"
        )
        lines.append(f"  - Gemba: {node['gemba_result']} — {node['gemba_notes']}")
        if node["countermeasure"]:
            lines.append(f"  - Countermeasure: {node['countermeasure']}")
        for att in node.get("attachments", []):
            if att["type"] == "audio":
                status = att.get("transcription_status")
                if status == "unavailable":
                    lines.append(
                        f"  - Attachment ({att['type']}): {att['url']} — "
                        "transcription unavailable"
                    )
                elif att.get("transcription"):
                    lines.append(
                        f"  - Attachment ({att['type']}): {att['url']} — "
                        f"transcript: {att['transcription']}"
                    )
                else:
                    lines.append(
                        f"  - Attachment ({att['type']}): {att['url']} — "
                        f"transcription {status or 'pending'}"
                    )
            else:
                lines.append(f"  - Attachment ({att['type']}): {att['url']}")

    root_cause_nodes = [n for n in sorted_nodes if n["is_root_cause"]]
    lines += ["", "## Root Cause", ""]
    if root_cause_nodes:
        lines.append(root_cause_nodes[0]["hypothesis"])
    else:
        lines.append("Not conclusively identified within the configured max depth.")

    return "\n".join(lines) + "\n"


async def report_generator(state: OverallState) -> dict[str, Any]:
    markdown = _build_report_markdown(state)
    directory = Path(INVESTIGATIONS_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    report_path = directory / f"{state['investigation_id']}.md"
    report_path.write_text(markdown)
    return {"report_path": str(report_path)}


def _find_why_node(state: OverallState, branch_path: str) -> WhyNode | None:
    for node in state["why_nodes"]:
        if (
            node["branch_path"] == branch_path
            and node.get("status", "active") != "deleted"
        ):
            return node
    return None


def _why_router(
    state: OverallState,
) -> Literal["gemba_dispatcher", "root_cause_validator"]:
    if state["pending_hypotheses"]:
        return "gemba_dispatcher"
    return "root_cause_validator"


def _gemba_router(state: OverallState) -> Literal["gemba_check"]:
    return "gemba_check"


def _check_complete_router(
    state: OverallState,
) -> Literal["root_cause_validator", "gemba_dispatcher", "why_generator"]:
    active = state.get("active_hypothesis")
    why_node = _find_why_node(state, active["branch_path"]) if active else None
    gemba_result = why_node["gemba_result"] if why_node else None

    if gemba_result == "NOK":
        return "root_cause_validator"

    if state["pending_hypotheses"]:
        return "gemba_dispatcher"
    return "why_generator"


def _validate_router(
    state: OverallState,
) -> Literal["countermeasure_generator", "why_generator"]:
    if state["current_depth"] >= state["max_depth"]:
        return "countermeasure_generator"

    active = state.get("active_hypothesis")
    why_node = _find_why_node(state, active["branch_path"]) if active else None
    if why_node is not None and why_node["is_root_cause"]:
        return "countermeasure_generator"

    return "why_generator"


def build_graph() -> StateGraph:
    graph = StateGraph(OverallState)

    graph.add_node("intake", intake)
    graph.add_node("why_generator", why_generator)
    graph.add_node("gemba_dispatcher", gemba_dispatcher)
    graph.add_node("gemba_check", gemba_check)
    graph.add_node("root_cause_validator", root_cause_validator)
    graph.add_node("countermeasure_generator", countermeasure_generator)
    graph.add_node("report_generator", report_generator)

    graph.set_entry_point("intake")
    graph.add_edge("intake", "why_generator")
    graph.add_conditional_edges("why_generator", _why_router)
    graph.add_conditional_edges("gemba_dispatcher", _gemba_router)
    graph.add_conditional_edges("gemba_check", _check_complete_router)
    graph.add_conditional_edges("root_cause_validator", _validate_router)
    graph.add_edge("countermeasure_generator", "report_generator")
    graph.set_finish_point("report_generator")

    return graph
