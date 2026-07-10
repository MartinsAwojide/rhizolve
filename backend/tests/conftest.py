import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app
from models.project_member import ProjectMember, Role


@pytest.fixture
async def async_client():
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client


@pytest.fixture
async def authed_client(async_client, monkeypatch):
    clerk_user_id = f"clerk_user_{uuid.uuid4()}"

    async def _payload(request):
        return {"sub": clerk_user_id, "email": f"{clerk_user_id}@test.com"}

    monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
    async_client.headers["Authorization"] = "Bearer testtoken"
    r = await async_client.post("/api/v1/auth/sync")
    assert r.status_code == 200
    async_client.current_user = r.json()
    yield async_client


@pytest.fixture
def current_user(authed_client):
    return authed_client.current_user


@pytest.fixture
async def db_session_factory(async_client):
    return app.state.db_sessionmaker


@pytest.fixture
def add_project_member(db_session_factory):
    async def _add(
        async_client,
        monkeypatch,
        project_id: str,
        role: Role,
        status: str = "active",
        clerk_org_id: str | None = None,
    ) -> int:
        clerk_user_id = f"clerk_user_{uuid.uuid4()}"

        async def _payload(request):
            payload = {"sub": clerk_user_id, "email": f"{clerk_user_id}@test.com"}
            if clerk_org_id is not None:
                payload["org_id"] = clerk_org_id
                payload["org_slug"] = clerk_org_id
            return payload

        monkeypatch.setattr("core.auth.verify_clerk_token", _payload)
        async_client.headers["Authorization"] = f"Bearer {clerk_user_id}"
        r = await async_client.post("/api/v1/auth/sync")
        user_id = r.json()["id"]

        async with db_session_factory() as session:
            session.add(
                ProjectMember(
                    project_id=project_id, user_id=user_id, role=role, status=status
                )
            )
            await session.commit()
        return user_id

    return _add


@pytest.fixture
def mock_llm(monkeypatch):
    mock_client = AsyncMock()
    canned_content = json.dumps(
        {
            "phenomenon": "glue tank overflowing",
            "domain": None,
            "system_or_process_context": "line 3",
            "confidence": {
                "phenomenon": 0.92,
                "domain": 0.0,
                "system_or_process_context": 0.85,
            },
        }
    )
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=canned_content))]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    monkeypatch.setattr("agent.extractor.get_llm_client", lambda: mock_client)
    return mock_client
