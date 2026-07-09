from typing import Annotated, Any, Literal, NotRequired, TypedDict

from langgraph.graph import StateGraph


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
    attachments: NotRequired[list[Any]]


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
        "current_depth": 0,
        "current_branch_path": "root",
        "why_nodes": [],
        "pending_hypotheses": [],
    }


async def why_generator(state: OverallState) -> dict[str, Any]:
    return {}


async def gemba_dispatcher(state: OverallState) -> dict[str, Any]:
    return {}


async def gemba_check(state: OverallState) -> dict[str, Any]:
    return {}


async def root_cause_validator(state: OverallState) -> dict[str, Any]:
    return {}


async def countermeasure_generator(state: OverallState) -> dict[str, Any]:
    return {}


async def report_generator(state: OverallState) -> dict[str, Any]:
    return {}


def _find_why_node(state: OverallState, branch_path: str) -> WhyNode | None:
    for node in state["why_nodes"]:
        if node["branch_path"] == branch_path:
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
