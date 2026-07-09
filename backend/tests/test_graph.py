import pytest

from agent.graph import build_graph
from core.memory import make_checkpointer


def test_build_graph_has_nine_nodes():
    graph = build_graph()
    compiled = graph.compile()
    node_names = set(compiled.get_graph().nodes.keys())

    assert node_names == {
        "__start__",
        "intake",
        "why_generator",
        "gemba_dispatcher",
        "gemba_check",
        "root_cause_validator",
        "countermeasure_generator",
        "report_generator",
        "__end__",
    }
    assert len(node_names) == 9


@pytest.mark.asyncio
async def test_graph_runs_start_to_finish_with_real_redis_checkpointer():
    checkpointer, ctx = await make_checkpointer()
    try:
        graph = build_graph().compile(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": "test-graph-skeleton"}}

        result = await graph.ainvoke(
            {
                "investigation_id": "inv-001",
                "project_id": "proj-001",
                "phenomenon": "Glue tank overflowed",
                "domain": "manufacturing",
                "system_or_process_context": "line 3",
                "max_depth": 5,
                "current_depth": 0,
                "current_branch_path": "root",
                "why_nodes": [],
                "pending_hypotheses": [],
            },
            config,
        )

        assert result["current_branch_path"] == "root"

        snapshot = await graph.aget_state(config)
        assert snapshot.values["phenomenon"] == "Glue tank overflowed"
    finally:
        await ctx.__aexit__(None, None, None)
