import uuid
from typing import Any

import google.generativeai as genai
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.parser.chunker import Chunk


class EmbeddingService:
    """Generates and stores vector embeddings using Google Gemini."""

    def __init__(self) -> None:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self._model = settings.EMBEDDING_MODEL

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        batch_size = 100
        all_vectors: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = genai.embed_content(
                model=self._model,
                content=batch,
                task_type="retrieval_document",
            )
            if isinstance(result["embedding"][0], list):
                all_vectors.extend(result["embedding"])
            else:
                all_vectors.append(result["embedding"])
        return all_vectors

    async def store_embeddings(
        self,
        repo_id: uuid.UUID,
        chunks: list[Chunk],
        db_session: AsyncSession,
    ) -> None:
        if not chunks:
            return

        from app.models.embedding import Embedding

        texts = [c.content for c in chunks]
        vectors = await self.generate_embeddings(texts)

        rows: list[dict[str, Any]] = []
        for chunk, vector in zip(chunks, vectors):
            rows.append(
                {
                    "id": uuid.uuid4(),
                    "repository_id": repo_id,
                    "chunk_id": chunk.chunk_id,
                    "content": chunk.content,
                    "file_path": chunk.file_path,
                    "symbol_name": chunk.symbol_name,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "language": chunk.language,
                    "embedding": vector,
                }
            )

        if rows:
            await db_session.execute(insert(Embedding), rows)
            await db_session.flush()
