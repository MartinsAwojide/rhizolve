import pytest


@pytest.mark.asyncio
async def test_shallow_does_not_invoke_graph(async_client):
    r = await async_client.post(
        "/api/v1/chat", json={"message": "What is 5 Whys?", "mode": "shallow"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["graph_invoked"] is False
    assert isinstance(body["response"], str)
    assert len(body["response"]) > 0


@pytest.mark.asyncio
async def test_deep_does_not_error(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={"message": "Trucks keep hitting the loading-bay walls", "mode": "deep"},
    )
    assert r.status_code == 200
    assert r.json()["graph_invoked"] is True


@pytest.mark.asyncio
async def test_btw_creates_independent_thread(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "/btw what is FMEA?",
            "mode": "deep",
            "thread_id": "main-001",
        },
    )
    body = r.json()
    assert body["thread_id"] != "main-001"
    assert body["ephemeral"] is True


@pytest.mark.asyncio
async def test_normal_message_keeps_thread_id(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "why do trucks hit the wall",
            "mode": "shallow",
            "thread_id": "main-001",
        },
    )
    body = r.json()
    assert body["thread_id"] == "main-001"
    assert body["ephemeral"] is False
