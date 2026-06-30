import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.retrieval.retriever import ContextRetriever, RetrievedChunk


class ContextEngine:
    """Orchestrates multi-strategy context retrieval and formatting."""

    def __init__(self) -> None:
        self._retriever = ContextRetriever()

    async def build_context(
        self,
        query: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
    ) -> str:
        """Build a formatted context string for an LLM query.

        Strategy:
        1. Attempt exact symbol lookup (tokens that look like identifiers).
        2. Fetch semantic (vector) results.
        3. Optionally expand with dependency / caller info.
        4. Deduplicate and format.

        Args:
            query: The user query or sub-query.
            repository_id: Repository to scope retrieval to.
            db_session: Active async SQLAlchemy session.

        Returns:
            A formatted markdown string with code snippets and metadata.
        """
        chunks: list[RetrievedChunk] = []

        # 1. Try exact symbol lookup for identifiers in the query
        identifiers = self._extract_identifiers(query)
        for ident in identifiers[:3]:  # Limit to avoid over-fetching
            exact = await self._retriever.get_symbol(ident, repository_id, db_session)
            chunks.extend(exact)

        # 2. Semantic search
        semantic = await self._retriever.retrieve(
            query, repository_id, db_session, top_k=settings.RETRIEVAL_DEPTH
        )
        chunks.extend(semantic)

        # 3. Dependency expansion for first exact match
        if identifiers:
            deps = await self._retriever.get_dependencies(
                identifiers[0], repository_id, db_session
            )
            callers = await self._retriever.get_callers(
                identifiers[0], repository_id, db_session
            )
            chunks.extend(deps[:3])
            chunks.extend(callers[:3])

        # 4. Deduplicate by content fingerprint
        chunks = self._deduplicate(chunks)

        if not chunks:
            return "No relevant context found for this query."

        return self._format_context(chunks)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_identifiers(query: str) -> list[str]:
        """Extract likely code identifiers from the query."""
        import re

        tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", query)
        # Filter short tokens and Python keywords
        stop = {
            "the", "a", "an", "of", "in", "for", "to", "and", "or", "is",
            "are", "how", "what", "does", "do", "can", "this", "that", "with",
            "use", "using", "explain", "show", "me", "my", "your", "its",
            "def", "class", "function", "method", "return", "if", "else",
        }
        return [t for t in tokens if len(t) > 3 and t.lower() not in stop]

    @staticmethod
    def _deduplicate(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        seen: set[str] = set()
        unique: list[RetrievedChunk] = []
        for chunk in chunks:
            # Use first 200 chars as fingerprint
            fp = chunk.content[:200].strip()
            if fp and fp not in seen:
                seen.add(fp)
                unique.append(chunk)
        return unique

    @staticmethod
    def _format_context(chunks: list[RetrievedChunk]) -> str:
        parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            header_parts = [f"### Chunk {i}"]
            if chunk.file_path:
                header_parts.append(f"**File:** `{chunk.file_path}`")
            if chunk.symbol_name:
                header_parts.append(f"**Symbol:** `{chunk.symbol_name}`")
            if chunk.start_line and chunk.end_line:
                header_parts.append(
                    f"**Lines:** {chunk.start_line}–{chunk.end_line}"
                )
            if chunk.score:
                header_parts.append(f"**Score:** {chunk.score:.3f}")

            lang = chunk.language or ""
            parts.append(
                "\n".join(header_parts)
                + f"\n```{lang}\n{chunk.content}\n```"
            )

        return "\n\n".join(parts)
