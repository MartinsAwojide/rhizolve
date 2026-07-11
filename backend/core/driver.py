from typing import TypedDict

ROLE_RANK: dict[str, int] = {
    "owner": 0,
    "analyst": 1,
    "contributor": 2,
    "operator": 3,
    "manager": 4,
    "viewer": 5,
}
STEERING_ROLES = ("owner", "analyst", "contributor")


class ActiveParticipant(TypedDict):
    user_id: str
    name: str | None
    role: str
    joined_at: str
    editing: bool
    editing_node: str | None


def resolve_driver(
    active_participants: list[ActiveParticipant],
) -> ActiveParticipant | None:
    if not active_participants:
        return None
    steering = [p for p in active_participants if p["role"] in STEERING_ROLES]
    if not steering:
        return active_participants[0]
    return min(steering, key=lambda p: (ROLE_RANK[p["role"]], p["joined_at"]))
