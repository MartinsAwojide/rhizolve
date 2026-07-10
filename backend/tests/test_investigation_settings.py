from agent.schemas import InvestigationSettings


def test_user_edit_overrides_extracted():
    s = InvestigationSettings(
        extracted={"domain": "manufacturing"}, user_overrides={"domain": "aerospace"}
    )
    assert s.resolved["domain"] == "aerospace"


def test_extracted_overrides_static_default():
    s = InvestigationSettings(
        extracted={"domain": "manufacturing"},
        user_overrides={},
        static_defaults={"domain": "general"},
    )
    assert s.resolved["domain"] == "manufacturing"
