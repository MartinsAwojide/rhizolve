import pytest


@pytest.mark.asyncio
async def test_settings_defaults_returns_static_defaults(async_client):
    r = await async_client.get("/api/v1/investigations/settings/defaults")
    assert r.status_code == 200
    body = r.json()
    assert body["phenomenon"] is None
    assert body["domain"] is None
    assert body["system_or_process_context"] is None
    assert body["maturity"] == "unknown"
    assert body["maturity_source"] == "default"
