def detect_conflict(gemba_result: dict, why_nodes: list[dict]) -> bool:
    node = next(
        (n for n in why_nodes if n["branch_path"] == gemba_result["branch_path"]), None
    )
    if node is None:
        return False
    return node["gemba_result"] != "pending"
