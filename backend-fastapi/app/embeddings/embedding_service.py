import uuid
from typing import Any

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.parser.chunker import Chunk


_lazy_model = None


def _get_model():
    """Lazy-load sentence-transformers model (downloads on first use)."""
    global _lazy_model
    if _lazy_model is None:
        from sentence_transformers import SentenceTransformer
        _lazy_model = SentenceTransformer(settings.LOCAL_EMBEDDING_MODEL)
    return _lazy_model


class EmbeddingService:
    """Generates and stores vector embeddings using a local sentence-transformers model.

    Runs entirely on the EC2 — no API calls, no rate limits, no cost.
    """

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        model = _get_model()
        embeddings = model.encode(texts, show_progress_bar=False, batch_size=128)
        return embeddings.tolist()

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
