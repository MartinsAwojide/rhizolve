import pytest


@pytest.mark.asyncio
async def test_get_org_members_returns_clerk_members(async_client, monkeypatch):
    async def _payload(request):
        return {"sub": "member_user", "org_id": "clerk_org_2", "org_slug": "acme2"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    await async_client.post(
        "/api/v1/auth/sync", headers={"Authorization": "Bearer faketoken"}
    )

    async def _fake_members(clerk_org_id):
        assert clerk_org_id == "clerk_org_2"
        return [
            {
                "clerk_user_id": "member_user",
                "email": "member@acme.com",
                "first_name": "Ada",
                "last_name": "Lovelace",
                "role": "org:admin",
            }
        ]

    monkeypatch.setattr("api.organisations.list_clerk_org_members", _fake_members)
    r = await async_client.get(
        "/api/v1/organisations/members",
        headers={"Authorization": "Bearer faketoken"},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["email"] == "member@acme.com"
    assert body[0]["role"] == "org:admin"


@pytest.mark.asyncio
async def test_get_org_members_404_when_no_org(async_client, monkeypatch):
    async def _payload(request):
        return {"sub": "no_org_user"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    r = await async_client.get(
        "/api/v1/organisations/members",
        headers={"Authorization": "Bearer faketoken"},
    )
    assert r.status_code == 404
