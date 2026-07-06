import uuid
import re
from typing import Optional

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.retrieval.retriever import ContextRetriever, RetrievedChunk


_MAX_CONTEXT_CHARS = 6000
_MAX_CHUNK_CHARS = 500
_MAX_FILE_EXPAND = 3
_MAX_EXACT_TERMS = 4


class ContextEngine:
    """Token-efficient context builder — prefers exact hits, caps total size."""

    KNOWLEDGE_MAP = {
        "knowledge_tool": {
            "explain": "You are a software architect. Explain code with file references.",
            "how": "You are a code tutor. Walk through logic step by step.",
            "summarize": "You are a code reviewer. Summarize the code's purpose.",
            "default": "Answer using ONLY the context below. Reference specific files.",
        },
        "review_tool": {
            "security": "Find vulnerabilities: injection, auth bypass, hardcoded secrets.",
            "default": "Review for correctness, security, and maintainability.",
        },
        "testing_tool": {
            "default": "Generate tests covering happy path, edge cases, and errors.",
        },
    }

    def __init__(self) -> None:
        self._retriever = ContextRetriever()

    async def build_context(
        self,
        query: str,
        repository_id: uuid.UUID,
        db_session: AsyncSession,
    ) -> str:
        chunks: list[RetrievedChunk] = []
        seen_symbols: set[str] = set()

        # 1. Identifier extraction — tight limit
        identifiers = self._extract_identifiers(query)
        expanded = self._expand_identifiers(identifiers, query)
        all_terms = list(set(identifiers + expanded))[:_MAX_EXACT_TERMS]

        # 2. Exact symbol lookups (highest value)
        for term in all_terms:
            exact = await self._retriever.get_symbol(term, repository_id, db_session)
            for c in exact:
                if c.symbol_name and c.symbol_name not in seen_symbols:
                    seen_symbols.add(c.symbol_name)
                    chunks.append(c)

        # 3. Semantic search — capped
        need = settings.RETRIEVAL_DEPTH - len(chunks)
        if need > 0:
            semantic = await self._retriever.retrieve(query, repository_id, db_session, top_k=max(5, min(need, 12)))
            for c in semantic:
                if not (c.symbol_name and c.symbol_name in seen_symbols):
                    chunks.append(c)

        # 4. File expansion for top matched file (small)
        if chunks:
            file_counts: dict[str, int] = {}
            for c in chunks:
                if c.file_path:
                    file_counts[c.file_path] = file_counts.get(c.file_path, 0) + 1
            top_file = max(file_counts, key=file_counts.get) if file_counts else None
            if top_file:
                more = await self._retriever.get_file_chunks(repository_id, top_file, db_session)
                chunks.extend(more[:_MAX_FILE_EXPAND])

        # 5. Deduplicate and truncate
        result = self._format_token_efficient(chunks)

        if not result:
            return "No relevant context found."
        if len(result) > _MAX_CONTEXT_CHARS:
            result = result[:_MAX_CONTEXT_CHARS] + "\n\n[Context truncated]"
        return result

    @staticmethod
    def _format_token_efficient(chunks: list[RetrievedChunk]) -> str:
        """Compact formatting — no headers, just code blocks with file paths."""
        seen: set[str] = set()
        parts = []
        for chunk in chunks:
            fp = chunk.content[:80].strip()
            if not fp or fp in seen:
                continue
            seen.add(fp)
            content = chunk.content[:_MAX_CHUNK_CHARS]
            if chunk.content and content != chunk.content:
                content += "\n// ..."
            tag = chunk.file_path or ""
            if chunk.symbol_name:
                tag = f"{tag} :: {chunk.symbol_name}"
            parts.append(f"--- {tag} ---\n```\n{content}\n```")
        return "\n".join(parts[:35])

    @staticmethod
    def _extract_identifiers(query: str) -> list[str]:
        tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", query)
        stop = {
            "the", "a", "an", "of", "in", "for", "to", "and", "or", "is",
            "are", "how", "what", "does", "do", "can", "this", "that", "with",
            "use", "using", "explain", "show", "me", "my", "your", "its",
            "def", "class", "function", "method", "return", "if", "else",
            "explain", "tell", "describe", "summarize", "find", "list",
            "generate", "create", "write", "review", "check", "test",
            "implement", "implementation", "flow", "diagram", "overview",
        }
        return [t for t in tokens if len(t) > 2 and t.lower() not in stop]

    @staticmethod
    def _expand_identifiers(identifiers: list[str], query: str) -> list[str]:
        expanded = []
        domain_map = {
            "auth": ["AuthService", "JwtToken", "Login", "SecurityConfig"],
            "login": ["AuthService", "JwtToken", "LoginRequest", "AuthController"],
            "user": ["User", "UserRepository", "UserDetails", "AuthService"],
            "jwt": ["JwtTokenProvider", "JwtAuthFilter", "JwtService"],
            "token": ["JwtTokenProvider", "JwtService"],
            "api": ["Controller", "RestController", "RequestMapping"],
            "config": ["Configuration", "Settings", "Properties"],
            "security": ["SecurityConfig", "JwtAuthFilter", "CorsFilter"],
            "test": ["Test", "Mock", "TestCase"],
            "error": ["Exception", "ErrorHandler", "GlobalExceptionHandler"],
            "cache": ["CacheService", "Redis", "CacheManager"],
        }
        for ident in identifiers:
            key = ident.lower()
            for domain_key, terms in domain_map.items():
                if domain_key in key or key in domain_key:
                    expanded.extend(terms)
        return expanded

    @staticmethod
    def detect_intent(query: str) -> str:
        q = query.lower()
        if any(w in q for w in ["security", "vulnerability", "injection", "xss", "csrf"]):
            return "security_review"
        if any(w in q for w in ["performance", "slow", "optimize", "bottleneck"]):
            return "performance_review"
        if any(w in q for w in ["review", "bugs", "issues", "correctness"]):
            return "review"
        if any(w in q for w in ["test", "unit test", "pytest", "jest"]):
            return "test"
        if any(w in q for w in ["summarize", "summary", "overview", "architecture"]):
            return "summarize"
        return "explain"

    @staticmethod
    def get_system_prompt(tool_name: str, query: str) -> str:
        intent = ContextEngine.detect_intent(query)
        tool_map = ContextEngine.KNOWLEDGE_MAP.get(tool_name, ContextEngine.KNOWLEDGE_MAP["knowledge_tool"])
        base = tool_map.get(intent, tool_map["default"])
        return base + "\n\nGuidelines:\n- Use ONLY the context provided.\n- Reference specific files.\n- If insufficient context, say so.\n- Use Mermaid diagrams for flows."
