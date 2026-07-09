import pytest

from agent.graph import (
    _check_complete_router,
    _gemba_router,
    _merge_why_nodes,
    _validate_router,
    _why_router,
    build_graph,
    gemba_dispatcher,
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


def test_merge_why_nodes_appends_new_node():
    existing = [
        {
            "id": "n1",
            "branch_path": "root.h1",
            "depth": 1,
            "hypothesis": "seal wear",
            "gemba_result": "pending",
            "gemba_notes": "",
            "is_root_cause": False,
            "countermeasure": "",
        }
    ]
    update = [
        {
            "id": "n2",
            "branch_path": "root.h2",
            "depth": 1,
            "hypothesis": "pump failure",
            "gemba_result": "pending",
            "gemba_notes": "",
            "is_root_cause": False,
            "countermeasure": "",
        }
    ]
    merged = _merge_why_nodes(existing, update)
    assert [node["id"] for node in merged] == ["n1", "n2"]
    assert merged[0] == existing[0]


def test_merge_why_nodes_updates_existing_node_by_id():
    existing = [
        {
            "id": "n1",
            "branch_path": "root.h1",
            "depth": 1,
            "hypothesis": "seal wear",
            "gemba_result": "pending",
            "gemba_notes": "",
            "is_root_cause": False,
            "countermeasure": "",
        }
    ]
    update = [
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
    ]
    merged = _merge_why_nodes(existing, update)
    assert len(merged) == 1
    assert merged[0]["gemba_result"] == "NOK"
    assert merged[0]["gemba_notes"] == "seal cracked"


def test_merge_why_nodes_preserves_insertion_order():
    existing = [
        {
            "id": "n1",
            "branch_path": "root.h1",
            "depth": 1,
            "hypothesis": "seal wear",
            "gemba_result": "pending",
            "gemba_notes": "",
            "is_root_cause": False,
            "countermeasure": "",
        },
        {
            "id": "n2",
            "branch_path": "root.h2",
            "depth": 1,
            "hypothesis": "pump failure",
            "gemba_result": "pending",
            "gemba_notes": "",
            "is_root_cause": False,
            "countermeasure": "",
        },
    ]
    update = [
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
    ]
    merged = _merge_why_nodes(existing, update)
    assert [node["id"] for node in merged] == ["n1", "n2"]
    assert merged[0]["gemba_result"] == "OK"


@pytest.mark.asyncio
async def test_gemba_dispatcher_pops_next_pending_into_active_hypothesis():
    state = _base_state(
        pending_hypotheses=[
            {
                "hypothesis": "seal wear",
                "branch_path": "root.h1",
                "depth": 1,
                "gemba_instructions": "inspect seal",
            },
            {
                "hypothesis": "pump failure",
                "branch_path": "root.h2",
                "depth": 1,
                "gemba_instructions": "inspect pump",
            },
        ]
    )
    result = await gemba_dispatcher(state)
    assert result["active_hypothesis"] == {
        "hypothesis": "seal wear",
        "branch_path": "root.h1",
        "depth": 1,
        "gemba_instructions": "inspect seal",
    }


@pytest.mark.asyncio
async def test_gemba_dispatcher_creates_pending_why_node_at_branch_path():
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
    result = await gemba_dispatcher(state)
    new_nodes = result["why_nodes"]
    assert len(new_nodes) == 1
    node = new_nodes[0]
    assert node["branch_path"] == "root.h1"
    assert node["depth"] == 1
    assert node["hypothesis"] == "seal wear"
    assert node["gemba_result"] == "pending"
    assert node["is_root_cause"] is False
    assert node["id"]


@pytest.mark.asyncio
async def test_gemba_dispatcher_removes_dispatched_hypothesis_from_queue():
    state = _base_state(
        pending_hypotheses=[
            {
                "hypothesis": "seal wear",
                "branch_path": "root.h1",
                "depth": 1,
                "gemba_instructions": "inspect seal",
            },
            {
                "hypothesis": "pump failure",
                "branch_path": "root.h2",
                "depth": 1,
                "gemba_instructions": "inspect pump",
            },
        ]
    )
    result = await gemba_dispatcher(state)
    assert result["pending_hypotheses"] == [
        {
            "hypothesis": "pump failure",
            "branch_path": "root.h2",
            "depth": 1,
            "gemba_instructions": "inspect pump",
        }
    ]


@pytest.mark.asyncio
async def test_graph_merges_why_nodes_across_state_updates():
    checkpointer, ctx = await make_checkpointer()
    try:
        graph = build_graph().compile(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": "test-merge-why-nodes"}}

        await graph.aupdate_state(
            config,
            {
                "investigation_id": "inv-001",
                "project_id": "proj-001",
                "phenomenon": "Glue tank overflowed",
                "domain": "manufacturing",
                "system_or_process_context": "line 3",
                "max_depth": 5,
                "current_depth": 1,
                "current_branch_path": "root",
                "pending_hypotheses": [],
                "why_nodes": [
                    {
                        "id": "n1",
                        "branch_path": "root.h1",
                        "depth": 1,
                        "hypothesis": "seal wear",
                        "gemba_result": "pending",
                        "gemba_notes": "",
                        "is_root_cause": False,
                        "countermeasure": "",
                    }
                ],
            },
            as_node="intake",
        )
        await graph.aupdate_state(
            config,
            {
                "why_nodes": [
                    {
                        "id": "n2",
                        "branch_path": "root.h2",
                        "depth": 1,
                        "hypothesis": "pump failure",
                        "gemba_result": "pending",
                        "gemba_notes": "",
                        "is_root_cause": False,
                        "countermeasure": "",
                    }
                ]
            },
            as_node="intake",
        )

        snapshot = await graph.aget_state(config)
        ids = {node["id"] for node in snapshot.values["why_nodes"]}
        assert ids == {"n1", "n2"}
    finally:
        await ctx.__aexit__(None, None, None)


@pytest.mark.asyncio
async def test_graph_runs_start_to_finish_with_real_redis_checkpointer(monkeypatch):
    async def _empty_why_generator(state):
        return {"pending_hypotheses": []}

    monkeypatch.setattr("agent.graph.why_generator", _empty_why_generator)

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
