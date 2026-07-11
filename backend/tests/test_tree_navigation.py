# Deviates from US-25's given test (`assert "1.1.1" not in result`): hard_reset
# tombstones via status="deleted" rather than removing dict keys, since the
# real runtime state's _merge_why_nodes reducer would resurrect any node
# dropped from a shorter list on the next graph write — see ADR-015.
from agent.tree_navigation import hard_reset, soft_reset


def _tree():
    return {
        "1": {"branch_path": "1", "status": "active"},
        "1.1": {"branch_path": "1.1", "status": "active"},
        "1.1.1": {"branch_path": "1.1.1", "status": "active"},
        "1.2": {"branch_path": "1.2", "status": "active"},
        "2": {"branch_path": "2", "status": "active"},
    }


def test_soft_reset_suspends_children_not_siblings():
    tree = _tree()
    result = soft_reset(tree, "1.1")
    assert result["1.1"]["status"] == "suspended"
    assert result["1.1.1"]["status"] == "suspended"
    assert result["1.2"]["status"] == "active"
    assert result["2"]["status"] == "active"


def test_hard_reset_deletes_children():
    tree = _tree()
    result = hard_reset(tree, "1.1")
    assert result["1.1"]["status"] == "deleted"
    assert result["1.1.1"]["status"] == "deleted"
    assert "1.1.1" in result
    assert result["1.2"]["status"] == "active"


def test_soft_reset_target_itself_marked_suspended():
    tree = _tree()
    result = soft_reset(tree, "1.2")
    assert result["1.2"]["status"] == "suspended"


def test_reset_on_leaf_node_only_affects_that_node():
    tree = _tree()
    result = soft_reset(tree, "1.1.1")
    assert result["1.1.1"]["status"] == "suspended"
    assert result["1.1"]["status"] == "active"
    assert result["1"]["status"] == "active"


def test_reset_does_not_mutate_input_dict():
    tree = _tree()
    soft_reset(tree, "1.1")
    assert tree["1.1"]["status"] == "active"
    assert tree["1.1.1"]["status"] == "active"
