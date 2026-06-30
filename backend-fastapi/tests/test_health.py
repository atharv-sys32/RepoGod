import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(async_client: AsyncClient) -> None:
    """GET /health must return HTTP 200 with body {"status": "ok"}."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
