from agent.schemas import ModeSwitchCard


def build_mode_switch_card(
    phenomenon: str | None = None,
    domain: str | None = None,
    system_or_process_context: str | None = None,
    maturity: str | None = None,
    maturity_source: str | None = None,
) -> ModeSwitchCard:
    return ModeSwitchCard(
        phenomenon=phenomenon,
        domain=domain,
        system_or_process_context=system_or_process_context,
        maturity=maturity,
        maturity_source=maturity_source,
    )
