import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.fixture
async def async_client():
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client


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
