import uuid
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.embeddings.embedding_service import EmbeddingService
from app.models.embedding import Embedding
from app.models.repository import AstNode, DependencyEdge, CallGraphEdge


@dataclass
class RetrievedChunk:
    """A chunk retrieved from the vector store or AST index."""

    content: str
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    start_line: int = 0
    end_line: int = 0
    language: Optional[str] = None
    score: float = 0.0
    source: str = "vector"  # "vector" | "exact" | "dependency" | "caller"
    metadata: dict = field(default_factory=dict)


class ContextRetriever:
    """Retrieves relevant code chunks for a given query."""

    def __init__(self) -> None:
        self._embedder = EmbeddingService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def retrieve(
        self,
        query: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
        top_k: int = 10,
    ) -> list[RetrievedChunk]:
        """Semantic vector similarity search.

        Args:
            query: Natural language query.
            repository_id: Scope the search to this repository.
            db_session: Active async SQLAlchemy session.
            top_k: Maximum number of results to return.

        Returns:
            List of RetrievedChunk objects ordered by similarity.
        """
        vectors = await self._embedder.generate_embeddings([query])
        if not vectors:
            return []

        query_vector = vectors[0]

        # Use pgvector cosine distance operator (<=>) with inline vector literal
        # Using format() here is safe because vector_literal is our own generated data, not user input
        vector_literal = f"[{','.join(str(v) for v in query_vector)}]"
        query_vector_sql = f"CAST('{vector_literal}' AS vector(384))"
        stmt = text(
            f"""
            SELECT
                content,
                file_path,
                symbol_name,
                start_line,
                end_line,
                language,
                1 - (embedding <=> {query_vector_sql}) AS score
            FROM embeddings
            WHERE repository_id = CAST(:repo_id AS uuid)
            ORDER BY embedding <=> {query_vector_sql}
            LIMIT :top_k
            """
        ).bindparams(
            repo_id=str(repository_id),
            top_k=top_k,
        )

        result = await db_session.execute(stmt)
        rows = result.fetchall()

        return [
            RetrievedChunk(
                content=row.content,
                file_path=row.file_path,
                symbol_name=row.symbol_name,
                start_line=row.start_line or 0,
                end_line=row.end_line or 0,
                language=row.language,
                score=float(row.score),
                source="vector",
            )
            for row in rows
        ]

    async def get_symbol(
        self,
        symbol_name: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
    ) -> list[RetrievedChunk]:
        """Exact symbol lookup from the ast_nodes table.

        Args:
            symbol_name: Fully-qualified or simple symbol name.
            repository_id: Scope to this repository.
            db_session: Active async SQLAlchemy session.

        Returns:
            List of matching RetrievedChunk objects.
        """
        stmt = select(AstNode).where(
            AstNode.repository_id == repository_id,
            AstNode.symbol_name.ilike(f"%{symbol_name}%"),
        )
        result = await db_session.execute(stmt)
        nodes = result.scalars().all()

        return [
            RetrievedChunk(
                content=n.content or "",
                file_path=None,  # resolved via join if needed
                symbol_name=n.symbol_name,
                start_line=n.start_line,
                end_line=n.end_line,
                score=1.0,
                source="exact",
            )
            for n in nodes
        ]

    async def get_dependencies(
        self,
        symbol_name: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
    ) -> list[RetrievedChunk]:
        """Retrieve files that the given symbol's file imports (outbound deps).

        Args:
            symbol_name: Symbol whose source file's imports we want.
            repository_id: Scope to this repository.
            db_session: Active async SQLAlchemy session.

        Returns:
            Chunks representing target files of dependency edges.
        """
        # First find the file containing the symbol
        node_stmt = select(AstNode).where(
            AstNode.repository_id == repository_id,
            AstNode.symbol_name.ilike(f"%{symbol_name}%"),
        )
        node_res = await db_session.execute(node_stmt)
        node = node_res.scalars().first()
        if node is None:
            return []

        # Get dependency edges from that file
        dep_stmt = select(DependencyEdge).where(
            DependencyEdge.repository_id == repository_id,
        )
        dep_res = await db_session.execute(dep_stmt)
        edges = dep_res.scalars().all()

        return [
            RetrievedChunk(
                content=f"Dependency: {e.source_file} -> {e.target_file} ({e.import_name or ''})",
                file_path=e.target_file,
                score=0.8,
                source="dependency",
            )
            for e in edges
        ]

    async def get_callers(
        self,
        symbol_name: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
    ) -> list[RetrievedChunk]:
        """Retrieve symbols that call the given symbol (inbound call graph edges).

        Args:
            symbol_name: The callee symbol to look up.
            repository_id: Scope to this repository.
            db_session: Active async SQLAlchemy session.

        Returns:
            Chunks representing caller symbols.
        """
        stmt = select(CallGraphEdge).where(
            CallGraphEdge.repository_id == repository_id,
            CallGraphEdge.callee_symbol.ilike(f"%{symbol_name}%"),
        )
        result = await db_session.execute(stmt)
        edges = result.scalars().all()

        return [
            RetrievedChunk(
                content=f"Called by: {e.caller_symbol} in {e.caller_file or 'unknown'}",
                file_path=e.caller_file,
                symbol_name=e.caller_symbol,
                score=0.75,
                source="caller",
            )
            for e in edges
        ]
