from typing import Any, Literal, TypedDict

import pytest
from langgraph.graph import StateGraph

from core.memory import make_checkpointer


class ScratchState(TypedDict):
    route: Literal["c", "d"]
    visited: list[str]


async def node_a(state: ScratchState) -> dict[str, Any]:
    return {"visited": [*state["visited"], "a"]}


async def node_b(state: ScratchState) -> dict[str, Any]:
    return {"visited": [*state["visited"], "b"]}


async def node_c(state: ScratchState) -> dict[str, Any]:
    return {"visited": [*state["visited"], "c"]}


async def node_d(state: ScratchState) -> dict[str, Any]:
    return {"visited": [*state["visited"], "d"]}


def _router(state: ScratchState) -> Literal["c", "d"]:
    return state["route"]


def _build_scratch_graph() -> StateGraph:
    graph = StateGraph(ScratchState)
    graph.add_node("a", node_a)
    graph.add_node("b", node_b)
    graph.add_node("c", node_c)
    graph.add_node("d", node_d)
    graph.set_entry_point("a")
    graph.add_edge("a", "b")
    graph.add_conditional_edges("b", _router)
    graph.set_finish_point("c")
    graph.set_finish_point("d")
    return graph


@pytest.mark.asyncio
async def test_interrupt_after_pauses_before_conditional_router_target_is_queued():
    checkpointer, ctx = await make_checkpointer()
    try:
        graph = _build_scratch_graph().compile(
            checkpointer=checkpointer, interrupt_after=["b"]
        )
        config = {"configurable": {"thread_id": "test-interrupt-sequencing"}}

        result = await graph.ainvoke(
            {"route": "c", "visited": []},
            config,
        )

        # b has run; c/d have NOT run yet -- the interrupt paused before the
        # conditional router's target executed.
        assert result["visited"] == ["a", "b"]

        snapshot = await graph.aget_state(config)
        # snapshot.next names the node(s) the router already resolved to and
        # queued for the next step -- proving the router DID fire during the
        # same superstep as b, before the interrupt suspended execution.
        assert snapshot.next == ("c",)

        # Resuming (None input) lets the queued node run.
        result = await graph.ainvoke(None, config)
        assert result["visited"] == ["a", "b", "c"]

        final_snapshot = await graph.aget_state(config)
        assert final_snapshot.next == ()
    finally:
        await ctx.__aexit__(None, None, None)
