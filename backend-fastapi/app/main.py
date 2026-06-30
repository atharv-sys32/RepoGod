from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.api.health import router as health_router
from app.api.indexing import router as indexing_router
from app.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connectivity
    async with engine.connect() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="RepoGod AI Service",
    version="1.0.0",
    description="AI-powered repository analysis backend for RepoGod",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(indexing_router)
app.include_router(chat_router)
