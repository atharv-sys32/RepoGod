import hashlib
import os
import uuid
from pathlib import Path
from typing import Optional

import git
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.embeddings.embedding_service import EmbeddingService
from app.models.repository import (
    AstNode,
    CallGraphEdge,
    DependencyEdge,
    Repository,
    RepositoryFile,
    RepositoryStatus,
)
from app.parser.chunker import SemanticChunker
from app.parser.language_detector import detect_language
from app.parser.tree_sitter_parser import TreeSitterParser
from app.utils.file_utils import is_binary, should_ignore


class IndexingService:
    """Orchestrates the full repository indexing pipeline."""

    def __init__(self) -> None:
        self._parser = TreeSitterParser()
        self._chunker = SemanticChunker()
        self._embedder = EmbeddingService()

    async def index_repository(
        self,
        repo_id: uuid.UUID,
        git_url: str,
        db_session: AsyncSession,
    ) -> None:
        """Run the full indexing pipeline for a repository.

        Steps:
        1. Clone the repository.
        2. Walk files, detect languages, persist RepositoryFile records.
        3. Parse each file with TreeSitterParser → AstNode records.
        4. Analyse imports → DependencyEdge records.
        5. Chunk files semantically.
        6. Generate and store embeddings.
        7. Mark repository as INDEXED.

        Args:
            repo_id: UUID of the Repository row.
            git_url: Remote Git URL to clone from.
            db_session: Active async SQLAlchemy session.
        """
        try:
            await self._set_status(repo_id, RepositoryStatus.CLONING, 0, db_session)

            # 1. Clone
            local_path = await self._clone(repo_id, git_url)
            await self._update_local_path(repo_id, local_path, db_session)

            # 2. Discover files
            await self._set_status(repo_id, RepositoryStatus.PARSING, 5, db_session)
            source_files = self._discover_files(local_path)
            total = len(source_files)
            await self._update_totals(repo_id, total, db_session)

            if total == 0:
                await self._set_status(
                    repo_id, RepositoryStatus.INDEXED, 100, db_session
                )
                return

            # 3 & 4. Parse and save AST nodes + dependency edges
            all_chunks = []
            for idx, file_path in enumerate(source_files):
                language = detect_language(file_path)
                file_record = await self._upsert_file(
                    repo_id, file_path, local_path, language, db_session
                )

                ast_nodes_data = self._parser.parse_file(file_path, language)

                # Persist AstNode records
                for node_data in ast_nodes_data:
                    ast_node = AstNode(
                        repository_id=repo_id,
                        file_id=file_record.id,
                        symbol_name=node_data.symbol_name,
                        symbol_type=node_data.symbol_type,
                        start_line=node_data.start_line,
                        end_line=node_data.end_line,
                        content=node_data.content,
                        metadata_=node_data.metadata,
                    )
                    db_session.add(ast_node)

                # Dependency edges (import analysis)
                deps = self._extract_imports(file_path, language)
                rel_path = os.path.relpath(file_path, local_path)
                for dep in deps:
                    edge = DependencyEdge(
                        repository_id=repo_id,
                        source_file=rel_path,
                        target_file=dep,
                        import_name=dep,
                        edge_type="import",
                    )
                    db_session.add(edge)

                # Chunks
                chunks = self._chunker.chunk_file(
                    file_path, language, ast_nodes_data
                )
                all_chunks.extend(chunks)

                # Progress update every 20 files
                if idx % 20 == 0:
                    progress = 5 + int((idx / total) * 70)
                    await self._update_progress(
                        repo_id, progress, idx + 1, db_session
                    )
                    await db_session.flush()

            await db_session.flush()

            # 5. Embeddings
            await self._set_status(
                repo_id, RepositoryStatus.EMBEDDING, 80, db_session
            )
            await self._embedder.store_embeddings(repo_id, all_chunks, db_session)
            await db_session.flush()

            # 6. Mark INDEXED
            await self._set_status(
                repo_id, RepositoryStatus.INDEXED, 100, db_session
            )
            await self._update_progress(repo_id, 100, total, db_session)
            await db_session.commit()

        except Exception as exc:
            await db_session.rollback()
            await self._set_status(repo_id, RepositoryStatus.FAILED, 0, db_session)
            await db_session.commit()
            raise

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _clone(self, repo_id: uuid.UUID, git_url: str) -> str:
        storage = settings.REPO_STORAGE_PATH
        local_path = os.path.join(storage, str(repo_id))
        if os.path.exists(local_path):
            # Re-use existing clone
            repo = git.Repo(local_path)
            repo.remotes.origin.pull()
        else:
            os.makedirs(local_path, exist_ok=True)
            git.Repo.clone_from(git_url, local_path, depth=1)
        return local_path

    def _discover_files(self, local_path: str) -> list[str]:
        result: list[str] = []
        for root, dirs, files in os.walk(local_path):
            # Prune ignored directories in-place
            dirs[:] = [
                d
                for d in dirs
                if not should_ignore(os.path.join(root, d))
            ]
            for fname in files:
                fpath = os.path.join(root, fname)
                if should_ignore(fpath):
                    continue
                if is_binary(fpath):
                    continue
                result.append(fpath)
        return result

    async def _upsert_file(
        self,
        repo_id: uuid.UUID,
        file_path: str,
        local_path: str,
        language: str,
        db_session: AsyncSession,
    ) -> RepositoryFile:
        rel_path = os.path.relpath(file_path, local_path)
        stat = os.stat(file_path)
        try:
            with open(file_path, "rb") as fh:
                data = fh.read()
            checksum = hashlib.sha256(data).hexdigest()
            line_count = data.count(b"\n")
        except OSError:
            checksum = None
            line_count = None

        # Check for existing record
        stmt = select(RepositoryFile).where(
            RepositoryFile.repository_id == repo_id,
            RepositoryFile.file_path == rel_path,
        )
        result = await db_session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.language = language
            existing.size_bytes = stat.st_size
            existing.line_count = line_count
            existing.checksum = checksum
            return existing

        new_file = RepositoryFile(
            repository_id=repo_id,
            file_path=rel_path,
            language=language,
            size_bytes=stat.st_size,
            line_count=line_count,
            checksum=checksum,
        )
        db_session.add(new_file)
        await db_session.flush()
        return new_file

    @staticmethod
    def _extract_imports(file_path: str, language: str) -> list[str]:
        """Simple regex-based import extraction."""
        import re

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
                source = fh.read()
        except OSError:
            return []

        imports: list[str] = []
        if language == "python":
            for m in re.finditer(
                r"^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))",
                source,
                re.MULTILINE,
            ):
                imports.append(m.group(1) or m.group(2))
        elif language in ("javascript", "typescript"):
            for m in re.finditer(
                r'(?:import\s+.*?\s+from\s+[\'"](.+?)[\'"]|require\s*\(\s*[\'"](.+?)[\'"]\s*\))',
                source,
            ):
                imports.append(m.group(1) or m.group(2))
        elif language == "java":
            for m in re.finditer(r"^import\s+([\w.]+);", source, re.MULTILINE):
                imports.append(m.group(1))
        elif language == "go":
            for m in re.finditer(r'"([\w./]+)"', source):
                imports.append(m.group(1))
        return imports

    async def _set_status(
        self,
        repo_id: uuid.UUID,
        status: RepositoryStatus,
        progress: int,
        db_session: AsyncSession,
    ) -> None:
        stmt = (
            update(Repository)
            .where(Repository.id == repo_id)
            .values(status=status, progress=progress)
        )
        await db_session.execute(stmt)
        await db_session.flush()

    async def _update_local_path(
        self,
        repo_id: uuid.UUID,
        local_path: str,
        db_session: AsyncSession,
    ) -> None:
        stmt = (
            update(Repository)
            .where(Repository.id == repo_id)
            .values(local_path=local_path)
        )
        await db_session.execute(stmt)
        await db_session.flush()

    async def _update_totals(
        self,
        repo_id: uuid.UUID,
        total: int,
        db_session: AsyncSession,
    ) -> None:
        stmt = (
            update(Repository)
            .where(Repository.id == repo_id)
            .values(total_files=total)
        )
        await db_session.execute(stmt)
        await db_session.flush()

    async def _update_progress(
        self,
        repo_id: uuid.UUID,
        progress: int,
        files_indexed: int,
        db_session: AsyncSession,
    ) -> None:
        stmt = (
            update(Repository)
            .where(Repository.id == repo_id)
            .values(progress=progress, files_indexed=files_indexed)
        )
        await db_session.execute(stmt)
