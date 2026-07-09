import pytest

from agent.graph import (
    _check_complete_router,
    _gemba_router,
    _validate_router,
    _why_router,
    build_graph,
)
from core.memory import make_checkpointer


def _base_state(**overrides):
    state = {
        "investigation_id": "inv-001",
        "project_id": "proj-001",
        "phenomenon": "Glue tank overflowed",
        "domain": "manufacturing",
        "system_or_process_context": "line 3",
        "max_depth": 5,
        "current_depth": 1,
        "current_branch_path": "root",
        "why_nodes": [],
        "pending_hypotheses": [],
    }
    state.update(overrides)
    return state


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


def test_why_router_dispatches_when_hypotheses_pending():
    state = _base_state(
        pending_hypotheses=[
            {
                "hypothesis": "seal wear",
                "branch_path": "root.h1",
                "depth": 1,
                "gemba_instructions": "inspect seal",
            }
        ]
    )
    assert _why_router(state) == "gemba_dispatcher"


def test_why_router_falls_back_to_validator_when_empty():
    state = _base_state(pending_hypotheses=[])
    assert _why_router(state) == "root_cause_validator"


def test_gemba_router_always_goes_to_check():
    assert _gemba_router(_base_state()) == "gemba_check"


def test_check_complete_router_nok_goes_to_validator():
    state = _base_state(
        active_hypothesis={
            "hypothesis": "seal wear",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "inspect seal",
        },
        why_nodes=[
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 1,
                "hypothesis": "seal wear",
                "gemba_result": "NOK",
                "gemba_notes": "seal cracked",
                "is_root_cause": False,
                "countermeasure": "",
            }
        ],
        pending_hypotheses=[],
    )
    assert _check_complete_router(state) == "root_cause_validator"


def test_check_complete_router_ok_dispatches_next_pending():
    state = _base_state(
        active_hypothesis={
            "hypothesis": "seal wear",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "inspect seal",
        },
        why_nodes=[
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 1,
                "hypothesis": "seal wear",
                "gemba_result": "OK",
                "gemba_notes": "seal fine",
                "is_root_cause": False,
                "countermeasure": "",
            }
        ],
        pending_hypotheses=[
            {
                "hypothesis": "pump failure",
                "branch_path": "root.h2",
                "depth": 1,
                "gemba_instructions": "inspect pump",
            }
        ],
    )
    assert _check_complete_router(state) == "gemba_dispatcher"


def test_check_complete_router_ok_with_empty_queue_regenerates():
    state = _base_state(
        active_hypothesis={
            "hypothesis": "seal wear",
            "branch_path": "root.h1",
            "depth": 1,
            "gemba_instructions": "inspect seal",
        },
        why_nodes=[
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 1,
                "hypothesis": "seal wear",
                "gemba_result": "OK",
                "gemba_notes": "seal fine",
                "is_root_cause": False,
                "countermeasure": "",
            }
        ],
        pending_hypotheses=[],
    )
    assert _check_complete_router(state) == "why_generator"


def test_validate_router_at_max_depth_goes_to_countermeasure():
    state = _base_state(current_depth=5, max_depth=5)
    assert _validate_router(state) == "countermeasure_generator"


def test_validate_router_ai_root_cause_goes_to_countermeasure():
    state = _base_state(
        current_depth=2,
        max_depth=5,
        active_hypothesis={
            "hypothesis": "seal wear",
            "branch_path": "root.h1",
            "depth": 2,
            "gemba_instructions": "inspect seal",
        },
        why_nodes=[
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 2,
                "hypothesis": "seal wear",
                "gemba_result": "NOK",
                "gemba_notes": "seal cracked",
                "is_root_cause": True,
                "countermeasure": "",
            }
        ],
    )
    assert _validate_router(state) == "countermeasure_generator"


def test_validate_router_continues_deeper_when_neither():
    state = _base_state(
        current_depth=2,
        max_depth=5,
        active_hypothesis={
            "hypothesis": "seal wear",
            "branch_path": "root.h1",
            "depth": 2,
            "gemba_instructions": "inspect seal",
        },
        why_nodes=[
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 2,
                "hypothesis": "seal wear",
                "gemba_result": "NOK",
                "gemba_notes": "seal cracked",
                "is_root_cause": False,
                "countermeasure": "",
            }
        ],
    )
    assert _validate_router(state) == "why_generator"


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
                "max_depth": 0,
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
