import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(async_client):
    r = await async_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_health_reports_redis_connected(async_client):
    r = await async_client.get("/api/v1/health")
    assert r.json()["redis"] == "connected"
