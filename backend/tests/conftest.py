import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.fixture
async def async_client():
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
