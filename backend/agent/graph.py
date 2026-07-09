from typing import Any, Literal, NotRequired, TypedDict

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


class OverallState(TypedDict):
    investigation_id: str
    project_id: str
    phenomenon: str
    domain: str
    system_or_process_context: str
    max_depth: int
    current_depth: int
    current_branch_path: str
    why_nodes: list[WhyNode]
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
    graph.add_edge("why_generator", "gemba_dispatcher")
    graph.add_edge("gemba_dispatcher", "gemba_check")
    graph.add_edge("gemba_check", "root_cause_validator")
    graph.add_edge("root_cause_validator", "countermeasure_generator")
    graph.add_edge("countermeasure_generator", "report_generator")
    graph.set_finish_point("report_generator")

    return graph
