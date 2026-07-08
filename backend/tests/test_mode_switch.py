from agent.mode_switch import build_mode_switch_card


def test_default_actions_are_the_three_required_options():
    card = build_mode_switch_card()
    assert card.actions == [
        "Start investigation",
        "Edit settings",
        "Just answer instead",
    ]


def test_pill_text_is_switching_to_deep_mode():
    card = build_mode_switch_card()
    assert card.pill == "switching to deep mode"


def test_extracted_fields_populate_when_provided():
    card = build_mode_switch_card(
        phenomenon="glue tank overflowing",
        domain="manufacturing",
        system_or_process_context="line 3",
        maturity="established",
        maturity_source="user history",
    )
    assert card.phenomenon == "glue tank overflowing"
    assert card.domain == "manufacturing"
    assert card.system_or_process_context == "line 3"
    assert card.maturity == "established"
    assert card.maturity_source == "user history"


def test_omitted_fields_default_to_none():
    card = build_mode_switch_card()
    assert card.phenomenon is None
    assert card.domain is None
    assert card.system_or_process_context is None
    assert card.maturity is None
    assert card.maturity_source is None


def test_default_prominence_is_full():
    card = build_mode_switch_card()
    assert card.prominence == "full"


def test_compact_prominence_passes_through():
    card = build_mode_switch_card(prominence="compact")
    assert card.prominence == "compact"
