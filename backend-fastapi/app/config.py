from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/repogod"
    REDIS_URL: str = "redis://localhost:6379"
    GOOGLE_API_KEY: str = ""
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    LLM_MODEL: str = "gemini-2.0-flash"
    CHUNK_SIZE: int = 1500
    RETRIEVAL_DEPTH: int = 10
    REPO_STORAGE_PATH: str = "/app/repos"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
