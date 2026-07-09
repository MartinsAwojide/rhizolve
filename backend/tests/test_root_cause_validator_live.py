import pytest

from agent.graph import root_cause_validator


def _base_state(**overrides):
    state = {
        "investigation_id": "inv-001",
        "project_id": "proj-001",
        "phenomenon": "Glue tank overflowed on line 3",
        "domain": "manufacturing",
        "system_or_process_context": "glue tank fill station, line 3",
        "max_depth": 5,
        "current_depth": 3,
        "current_branch_path": "root.h1",
        "why_nodes": [
            {
                "id": "n1",
                "branch_path": "root.h1",
                "depth": 3,
                "hypothesis": "the fill valve seal degraded from age",
                "gemba_result": "NOK",
                "gemba_notes": (
                    "operator confirmed seal is cracked and has not been "
                    "replaced since installation"
                ),
                "is_root_cause": False,
                "countermeasure": "",
            }
        ],
        "pending_hypotheses": [],
        "active_hypothesis": {
            "hypothesis": "the fill valve seal degraded from age",
            "branch_path": "root.h1",
            "depth": 3,
            "gemba_instructions": "inspect fill valve seal",
        },
    }
    state.update(overrides)
    return state


@pytest.mark.asyncio
async def test_root_cause_validator_returns_bool_verdict_from_live_llm():
    state = _base_state()
    result = await root_cause_validator(state)

    updated_node = result["why_nodes"][0]
    assert isinstance(updated_node["is_root_cause"], bool)
    assert result["current_depth"] == 3
    assert result["current_branch_path"] == "root.h1"
