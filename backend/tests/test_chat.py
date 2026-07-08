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
async def test_deep_without_action_awaits_confirmation(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={"message": "Trucks keep hitting the loading-bay walls", "mode": "deep"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["graph_invoked"] is False
    assert body["active_mode"] == "deep"
    assert body["mode_switch_card"] is not None


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


@pytest.mark.asyncio
async def test_deep_mode_returns_full_prominence_card_by_default(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "Trucks keep hitting the loading-bay walls",
            "mode": "deep",
        },
    )
    card = r.json()["mode_switch_card"]
    assert card is not None
    assert card["prominence"] == "full"


@pytest.mark.asyncio
async def test_quiet_mode_still_returns_card_compact(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "Trucks keep hitting the loading-bay walls, help me find out why",
            "mode": "deep",
            "verbosity": "quiet",
        },
    )
    card = r.json()["mode_switch_card"]
    assert card is not None
    assert card["prominence"] == "compact"


@pytest.mark.asyncio
async def test_just_answer_keeps_deep_mode_primed(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "why do our trucks keep hitting walls",
            "mode": "deep",
            "action": "just_answer",
        },
    )
    body = r.json()
    assert body["graph_invoked"] is False
    assert body["active_mode"] == "deep"


@pytest.mark.asyncio
async def test_start_investigation_invokes_graph_stub(async_client):
    r = await async_client.post(
        "/api/v1/chat",
        json={
            "message": "Trucks keep hitting the loading-bay walls",
            "mode": "deep",
            "action": "start_investigation",
        },
    )
    body = r.json()
    assert body["graph_invoked"] is True
    assert body["active_mode"] == "deep"


@pytest.mark.asyncio
async def test_active_mode_echoes_shallow_mode(async_client):
    r = await async_client.post(
        "/api/v1/chat", json={"message": "What is 5 Whys?", "mode": "shallow"}
    )
    assert r.json()["active_mode"] == "shallow"
