from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/repogod"
    REDIS_URL: str = "redis://localhost:6379"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    LOCAL_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    CHUNK_SIZE: int = 1500
    RETRIEVAL_DEPTH: int = 10
    REPO_STORAGE_PATH: str = "/app/repos"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
