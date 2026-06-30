from app.api.health import router as health_router
from app.api.indexing import router as indexing_router
from app.api.chat import router as chat_router

__all__ = ["health_router", "indexing_router", "chat_router"]
