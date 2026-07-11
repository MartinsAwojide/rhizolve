from core.quorum import check_quorum


def test_quorum_majority_of_steering_participants():
    active = [
        {"user_id": f"u{i}", "role": r}
        for i, r in enumerate(["owner", "analyst", "contributor", "operator", "viewer"])
    ]
    ready_user_ids = {"u0", "u1"}
    assert check_quorum(active, ready_user_ids) is True


def test_quorum_not_met_with_minority():
    active = [{"user_id": f"u{i}", "role": "analyst"} for i in range(3)]
    ready_user_ids = {"u0"}
    assert check_quorum(active, ready_user_ids) is False


def test_ready_user_who_left_session_does_not_count():
    active = [{"user_id": "u0", "role": "owner"}, {"user_id": "u1", "role": "analyst"}]
    ready_user_ids = {"u0", "u2"}
    assert check_quorum(active, ready_user_ids) is False


def test_solo_steering_participant_always_at_quorum():
    active = [{"user_id": "u0", "role": "owner"}]
    assert check_quorum(active, set()) is True


def test_solo_non_steering_participant_always_at_quorum():
    active = [{"user_id": "u0", "role": "viewer"}]
    assert check_quorum(active, set()) is True


def test_no_steering_eligible_active_participants_is_quorum():
    active = [
        {"user_id": "u0", "role": "viewer"},
        {"user_id": "u1", "role": "operator"},
    ]
    assert check_quorum(active, set()) is True


def test_even_steering_count_requires_strict_majority():
    active = [
        {"user_id": f"u{i}", "role": r}
        for i, r in enumerate(["owner", "analyst", "contributor", "owner"])
    ]
    assert check_quorum(active, {"u0", "u1"}) is False
    assert check_quorum(active, {"u0", "u1", "u2"}) is True


def test_empty_active_list_is_quorum():
    assert check_quorum([], set()) is True
