import pytest


async def _valid_payload(request):
    return {"sub": "clerk_001", "email": "user@acme.com"}


async def _no_payload(request):
    return None


@pytest.mark.asyncio
async def test_valid_clerk_token_returns_user(async_client, monkeypatch):
    monkeypatch.setattr("core.auth.verify_clerk_token", _valid_payload)
    r = await async_client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer faketoken"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["clerk_user_id"] == "clerk_001"
    assert body["email"] == "user@acme.com"


@pytest.mark.asyncio
async def test_first_login_creates_user_record(async_client, monkeypatch):
    async def _new_user_payload(request):
        return {"sub": "new_clerk_id", "email": "new@acme.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _new_user_payload)
    r = await async_client.post(
        "/api/v1/auth/sync", headers={"Authorization": "Bearer faketoken"}
    )
    assert r.status_code == 200
    assert r.json()["clerk_user_id"] == "new_clerk_id"

    # Re-query via a fresh session/request to prove it actually persisted,
    # not just that the same in-memory object was echoed back.
    r2 = await async_client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer faketoken"}
    )
    assert r2.status_code == 200
    assert r2.json()["clerk_user_id"] == "new_clerk_id"


@pytest.mark.asyncio
async def test_invalid_token_returns_401(async_client, monkeypatch):
    monkeypatch.setattr("core.auth.verify_clerk_token", _no_payload)
    r = await async_client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer badtoken"}
    )
    assert r.status_code == 401
