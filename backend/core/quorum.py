from core.driver import STEERING_ROLES


def check_quorum(active: list[dict], ready_user_ids: set[str]) -> bool:
    if len(active) <= 1:
        return True

    steering_ids = {p["user_id"] for p in active if p["role"] in STEERING_ROLES}
    if not steering_ids:
        return True

    ready_count = len(steering_ids & ready_user_ids)
    return ready_count > len(steering_ids) / 2
