from agent.graph import WhyNode


def _is_target_or_descendant(node_path: str, target_path: str) -> bool:
    return node_path == target_path or node_path.startswith(target_path + ".")


def soft_reset(tree: dict[str, WhyNode], path: str) -> dict[str, WhyNode]:
    result = dict(tree)
    for node_path, node in tree.items():
        if _is_target_or_descendant(node_path, path):
            result[node_path] = {**node, "status": "suspended"}
    return result


def hard_reset(tree: dict[str, WhyNode], path: str) -> dict[str, WhyNode]:
    result = dict(tree)
    for node_path, node in tree.items():
        if _is_target_or_descendant(node_path, path):
            result[node_path] = {**node, "status": "deleted"}
    return result
