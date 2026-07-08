import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(async_client):
    r = await async_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
