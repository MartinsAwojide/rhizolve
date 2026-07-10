from agent.graph import WhyNode
from models.project_member import MembershipScope

EXTERNAL_SAFE_FIELDS = {
    "id",
    "branch_path",
    "depth",
    "hypothesis",
    "gemba_result",
    "status",
}


def serialize_why_tree(nodes: list[WhyNode], scope: MembershipScope) -> dict:
    """Per ADR-006: external members see tree structure, not detail.

    WhyNode doesn't carry domain_context/RAG/integration fields per node
    today (domain_context lives on OverallState, not WhyNode; RAG/external
    integration context don't exist anywhere in the schema yet — E09/E11).
    Until those land, the closest analog for "detail vs structure" is
    gemba_notes/is_root_cause/countermeasure/model_attribution/attachments
    vs the structural fields above. Extend EXTERNAL_SAFE_FIELDS's
    complement when those fields are actually added to WhyNode.
    """
    if scope == MembershipScope.INTERNAL:
        return {"nodes": [dict(node) for node in nodes]}
    return {
        "nodes": [
            {key: value for key, value in node.items() if key in EXTERNAL_SAFE_FIELDS}
            for node in nodes
        ]
    }
