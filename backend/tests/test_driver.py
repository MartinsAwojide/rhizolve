from core.driver import resolve_driver


def test_owner_beats_analyst_for_driver():
    participants = [
        {"user_id": "u1", "role": "analyst", "joined_at": "2026-01-01T00:00:00Z"},
        {"user_id": "u2", "role": "owner", "joined_at": "2026-01-01T00:00:01Z"},
    ]
    assert resolve_driver(participants)["user_id"] == "u2"


def test_earlier_join_wins_on_equal_role():
    participants = [
        {"user_id": "u1", "role": "analyst", "joined_at": "2026-01-01T00:00:00Z"},
        {"user_id": "u2", "role": "analyst", "joined_at": "2026-01-01T00:00:01Z"},
    ]
    assert resolve_driver(participants)["user_id"] == "u1"


def test_no_steering_role_falls_back_to_first_active():
    participants = [
        {"user_id": "u1", "role": "viewer", "joined_at": "2026-01-01T00:00:00Z"},
        {"user_id": "u2", "role": "operator", "joined_at": "2026-01-01T00:00:01Z"},
    ]
    assert resolve_driver(participants)["user_id"] == "u1"


def test_empty_list_returns_none():
    assert resolve_driver([]) is None
