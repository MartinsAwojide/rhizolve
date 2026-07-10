import uuid

import pytest


@pytest.mark.asyncio
async def test_settings_defaults_returns_static_defaults(async_client):
    r = await async_client.post("/api/v1/investigations/settings/defaults", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["phenomenon"] is None
    assert body["domain"] is None
    assert body["system_or_process_context"] is None
    assert body["maturity"] == "unknown"
    assert body["maturity_source"] == "default"


@pytest.mark.asyncio
async def test_settings_defaults_extracts_from_conversation_history(
    async_client, mock_llm
):
    user_id = f"test-user-{uuid.uuid4()}"
    r = await async_client.post(
        "/api/v1/investigations/settings/defaults",
        json={
            "conversation_history": [
                {"role": "user", "content": "Our glue tank keeps overflowing"}
            ],
            "user_id": user_id,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["phenomenon"] == "glue tank overflowing"
    assert body["system_or_process_context"] == "line 3"


@pytest.mark.asyncio
async def test_settings_defaults_user_override_wins_over_extraction(
    async_client, mock_llm
):
    user_id = f"test-user-{uuid.uuid4()}"
    r = await async_client.post(
        "/api/v1/investigations/settings/defaults",
        json={
            "conversation_history": [
                {"role": "user", "content": "Our glue tank keeps overflowing"}
            ],
            "user_overrides": {"domain": "aerospace"},
            "user_id": user_id,
        },
    )
    assert r.status_code == 200
    assert r.json()["domain"] == "aerospace"


@pytest.mark.asyncio
async def test_settings_defaults_remembers_last_used_domain_across_calls(
    async_client, mock_llm
):
    user_id = f"test-user-{uuid.uuid4()}"
    first = await async_client.post(
        "/api/v1/investigations/settings/defaults",
        json={"user_overrides": {"domain": "aerospace"}, "user_id": user_id},
    )
    assert first.json()["domain"] == "aerospace"

    second = await async_client.post(
        "/api/v1/investigations/settings/defaults",
        json={"user_id": user_id},
    )
    assert second.json()["domain"] == "aerospace"
