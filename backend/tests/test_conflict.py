from core.conflict import detect_conflict


def make_why_node(branch_path: str, gemba_result: str) -> dict:
    return {"branch_path": branch_path, "gemba_result": gemba_result}


def test_detect_conflict_when_branch_closed():
    nodes = [make_why_node(branch_path="1.1", gemba_result="OK")]
    assert detect_conflict({"branch_path": "1.1", "result": "NOK"}, nodes) is True


def test_no_conflict_when_branch_pending():
    nodes = [make_why_node(branch_path="1.1", gemba_result="pending")]
    assert detect_conflict({"branch_path": "1.1", "result": "NOK"}, nodes) is False


def test_no_conflict_when_branch_not_found():
    nodes = [make_why_node(branch_path="1.2", gemba_result="OK")]
    assert detect_conflict({"branch_path": "1.1", "result": "NOK"}, nodes) is False


def test_conflict_when_root_cause_branch_resynced():
    nodes = [make_why_node(branch_path="1.1", gemba_result="ROOT_CAUSE")]
    assert detect_conflict({"branch_path": "1.1", "result": "OK"}, nodes) is True
