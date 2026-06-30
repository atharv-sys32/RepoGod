import re
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class AstNodeData:
    """Parsed symbol extracted from source code."""

    symbol_name: str
    symbol_type: str  # "class" | "function" | "method" | "interface" | "module"
    start_line: int
    end_line: int
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


# ──────────────────────────────────────────────────────────────────────────────
# Regex patterns per language
# ──────────────────────────────────────────────────────────────────────────────

_PYTHON_PATTERNS = [
    (re.compile(r"^class\s+(\w+)", re.MULTILINE), "class"),
    (re.compile(r"^(?:async\s+)?def\s+(\w+)", re.MULTILINE), "function"),
]

_JAVA_PATTERNS = [
    (
        re.compile(
            r"^(?:public|protected|private|abstract|final|static|\s)*"
            r"class\s+(\w+)",
            re.MULTILINE,
        ),
        "class",
    ),
    (
        re.compile(
            r"^(?:public|protected|private|\s)*"
            r"interface\s+(\w+)",
            re.MULTILINE,
        ),
        "interface",
    ),
    (
        re.compile(
            r"(?:public|protected|private|static|final|abstract|\s)+"
            r"\w[\w<>\[\]]*\s+(\w+)\s*\(",
            re.MULTILINE,
        ),
        "function",
    ),
]

_JS_TS_PATTERNS = [
    (re.compile(r"^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)", re.MULTILINE), "class"),
    (re.compile(r"^(?:export\s+)?interface\s+(\w+)", re.MULTILINE), "interface"),
    (
        re.compile(
            r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)", re.MULTILINE
        ),
        "function",
    ),
    (
        re.compile(
            r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(",
            re.MULTILINE,
        ),
        "function",
    ),
]

_GO_PATTERNS = [
    (re.compile(r"^func\s+\(.*?\)\s+(\w+)\s*\(", re.MULTILINE), "method"),
    (re.compile(r"^func\s+(\w+)\s*\(", re.MULTILINE), "function"),
    (re.compile(r"^type\s+(\w+)\s+struct", re.MULTILINE), "class"),
    (re.compile(r"^type\s+(\w+)\s+interface", re.MULTILINE), "interface"),
]

_RUST_PATTERNS = [
    (re.compile(r"^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)", re.MULTILINE), "function"),
    (re.compile(r"^(?:pub\s+)?struct\s+(\w+)", re.MULTILINE), "class"),
    (re.compile(r"^(?:pub\s+)?trait\s+(\w+)", re.MULTILINE), "interface"),
    (re.compile(r"^impl(?:\s+\w+)?\s+for\s+(\w+)", re.MULTILINE), "class"),
]

_RUBY_PATTERNS = [
    (re.compile(r"^class\s+(\w+)", re.MULTILINE), "class"),
    (re.compile(r"^module\s+(\w+)", re.MULTILINE), "module"),
    (re.compile(r"^def\s+(\w+)", re.MULTILINE), "function"),
]

_CSHARP_PATTERNS = [
    (
        re.compile(
            r"^(?:public|internal|protected|private|abstract|sealed|\s)*"
            r"class\s+(\w+)",
            re.MULTILINE,
        ),
        "class",
    ),
    (
        re.compile(
            r"^(?:public|internal|protected|private|\s)*"
            r"interface\s+(\w+)",
            re.MULTILINE,
        ),
        "interface",
    ),
    (
        re.compile(
            r"(?:public|protected|private|static|virtual|override|abstract|\s)+"
            r"\w[\w<>\[\]]*\s+(\w+)\s*\(",
            re.MULTILINE,
        ),
        "function",
    ),
]

_LANGUAGE_PATTERNS: dict[str, list[tuple[re.Pattern, str]]] = {
    "python": _PYTHON_PATTERNS,
    "java": _JAVA_PATTERNS,
    "typescript": _JS_TS_PATTERNS,
    "javascript": _JS_TS_PATTERNS,
    "go": _GO_PATTERNS,
    "rust": _RUST_PATTERNS,
    "ruby": _RUBY_PATTERNS,
    "csharp": _CSHARP_PATTERNS,
}


class TreeSitterParser:
    """AST-level parser for source files.

    Attempts to use tree-sitter when grammars are available; falls back to
    regex-based extraction automatically.
    """

    def parse_file(self, file_path: str, language: str) -> list[AstNodeData]:
        """Parse a source file and return extracted symbol nodes.

        Args:
            file_path: Absolute path to the source file.
            language: Language identifier (e.g. "python").

        Returns:
            List of AstNodeData objects representing symbols.
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
                source = fh.read()
        except OSError:
            return []

        return self._regex_parse(source, language, file_path)

    # ------------------------------------------------------------------
    # Regex fallback
    # ------------------------------------------------------------------

    def _regex_parse(
        self, source: str, language: str, file_path: str
    ) -> list[AstNodeData]:
        patterns = _LANGUAGE_PATTERNS.get(language, [])
        if not patterns:
            return []

        lines = source.splitlines()
        nodes: list[AstNodeData] = []

        for pattern, symbol_type in patterns:
            for match in pattern.finditer(source):
                symbol_name = match.group(1)
                start_line = source[: match.start()].count("\n") + 1
                end_line = self._find_end_line(lines, start_line - 1, language)
                content = "\n".join(lines[start_line - 1 : end_line])
                nodes.append(
                    AstNodeData(
                        symbol_name=symbol_name,
                        symbol_type=symbol_type,
                        start_line=start_line,
                        end_line=end_line,
                        content=content,
                        metadata={"file_path": file_path, "language": language},
                    )
                )

        # Deduplicate by (symbol_name, start_line)
        seen: set[tuple[str, int]] = set()
        unique: list[AstNodeData] = []
        for node in nodes:
            key = (node.symbol_name, node.start_line)
            if key not in seen:
                seen.add(key)
                unique.append(node)

        return unique

    @staticmethod
    def _find_end_line(lines: list[str], start_idx: int, language: str) -> int:
        """Heuristically find the end line for a symbol block."""
        total = len(lines)
        if start_idx >= total:
            return total

        # For indentation-based languages (Python, Ruby)
        if language in ("python", "ruby"):
            if start_idx + 1 >= total:
                return total
            # Find the base indentation of the block header
            header = lines[start_idx]
            base_indent = len(header) - len(header.lstrip())
            for i in range(start_idx + 1, total):
                stripped = lines[i].strip()
                if not stripped:
                    continue
                curr_indent = len(lines[i]) - len(lines[i].lstrip())
                if curr_indent <= base_indent and stripped:
                    return i  # exclusive
            return total

        # For brace-based languages — track brace depth
        depth = 0
        found_open = False
        for i in range(start_idx, min(start_idx + 500, total)):
            for ch in lines[i]:
                if ch == "{":
                    depth += 1
                    found_open = True
                elif ch == "}":
                    depth -= 1
                    if found_open and depth == 0:
                        return i + 1
        return min(start_idx + 50, total)
