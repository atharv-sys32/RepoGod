import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from app.parser.tree_sitter_parser import AstNodeData
from app.config import settings


@dataclass
class Chunk:
    """A semantically bounded chunk of source code."""

    chunk_id: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    # Convenience accessors — always available via metadata
    file_path: str = ""
    language: str = ""
    symbol_name: Optional[str] = None
    start_line: int = 0
    end_line: int = 0


class SemanticChunker:
    """Chunk source files along semantic boundaries (classes, functions)."""

    def __init__(self, max_chars: int = 0) -> None:
        # max_chars 0 means use config value converted from tokens → chars
        self._max_chars = max_chars or settings.CHUNK_SIZE * 4

    def chunk_file(
        self,
        file_path: str,
        language: str,
        ast_nodes: list[AstNodeData],
    ) -> list[Chunk]:
        """Produce chunks for a source file.

        If ast_nodes are available, each node becomes its own chunk (split
        further if too large). If there are no nodes, the file is split into
        fixed-size character windows.

        Args:
            file_path: Absolute path to the file.
            language: Detected language string.
            ast_nodes: Parsed AST nodes for this file.

        Returns:
            List of Chunk objects.
        """
        if ast_nodes:
            return self._chunk_by_nodes(file_path, language, ast_nodes)
        return self._chunk_by_sliding_window(file_path, language)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _make_chunk(
        self,
        file_path: str,
        language: str,
        content: str,
        symbol_name: Optional[str],
        start_line: int,
        end_line: int,
        index: int,
    ) -> Chunk:
        chunk_id = f"{file_path}::{symbol_name or 'chunk'}::{index}"
        metadata = {
            "file_path": file_path,
            "language": language,
            "symbol_name": symbol_name,
            "start_line": start_line,
            "end_line": end_line,
        }
        return Chunk(
            chunk_id=chunk_id,
            content=content,
            metadata=metadata,
            file_path=file_path,
            language=language,
            symbol_name=symbol_name,
            start_line=start_line,
            end_line=end_line,
        )

    def _chunk_by_nodes(
        self,
        file_path: str,
        language: str,
        ast_nodes: list[AstNodeData],
    ) -> list[Chunk]:
        chunks: list[Chunk] = []
        for idx, node in enumerate(ast_nodes):
            content = node.content
            if len(content) <= self._max_chars:
                chunks.append(
                    self._make_chunk(
                        file_path,
                        language,
                        content,
                        node.symbol_name,
                        node.start_line,
                        node.end_line,
                        idx,
                    )
                )
            else:
                # Split large node into overlapping sub-chunks
                sub_chunks = self._split_text(content, self._max_chars, overlap=200)
                base_line = node.start_line
                for sub_idx, sub_content in enumerate(sub_chunks):
                    line_offset = sub_content[: sub_content.find("\n")].count("\n")
                    chunks.append(
                        self._make_chunk(
                            file_path,
                            language,
                            sub_content,
                            node.symbol_name,
                            base_line + sub_idx * 30,
                            base_line + sub_idx * 30 + sub_content.count("\n"),
                            idx * 1000 + sub_idx,
                        )
                    )
        return chunks

    def _chunk_by_sliding_window(
        self, file_path: str, language: str
    ) -> list[Chunk]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
                source = fh.read()
        except OSError:
            return []

        if not source.strip():
            return []

        lines = source.splitlines()
        sub_chunks = self._split_text(source, self._max_chars, overlap=200)
        chunks: list[Chunk] = []
        char_cursor = 0
        for idx, sub in enumerate(sub_chunks):
            start_line = source[:char_cursor].count("\n") + 1
            end_line = start_line + sub.count("\n")
            chunks.append(
                self._make_chunk(
                    file_path,
                    language,
                    sub,
                    None,
                    start_line,
                    end_line,
                    idx,
                )
            )
            char_cursor += len(sub) - 200  # slide with overlap
        return chunks

    @staticmethod
    def _split_text(text: str, max_chars: int, overlap: int = 0) -> list[str]:
        """Split text into chunks of at most max_chars with optional overlap."""
        if len(text) <= max_chars:
            return [text]
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = start + max_chars
            if end < len(text):
                # Try to split at a newline
                newline_pos = text.rfind("\n", start, end)
                if newline_pos > start:
                    end = newline_pos + 1
            chunks.append(text[start:end])
            start = end - overlap if end - overlap > start else end
        return chunks
