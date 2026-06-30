import os

# Mapping from file extension (lowercase, without dot) to language name
EXTENSION_MAP: dict[str, str] = {
    "py": "python",
    "pyw": "python",
    "java": "java",
    "kt": "kotlin",
    "kts": "kotlin",
    "scala": "scala",
    "ts": "typescript",
    "tsx": "typescript",
    "js": "javascript",
    "jsx": "javascript",
    "mjs": "javascript",
    "cjs": "javascript",
    "go": "go",
    "rs": "rust",
    "rb": "ruby",
    "rake": "ruby",
    "cpp": "c_cpp",
    "cc": "c_cpp",
    "cxx": "c_cpp",
    "c": "c_cpp",
    "h": "c_cpp",
    "hpp": "c_cpp",
    "cs": "csharp",
    "php": "php",
    "swift": "swift",
    "m": "objective_c",
    "mm": "objective_c",
    "r": "r",
    "R": "r",
    "lua": "lua",
    "pl": "perl",
    "pm": "perl",
    "sh": "bash",
    "bash": "bash",
    "zsh": "bash",
    "fish": "bash",
    "sql": "sql",
    "html": "html",
    "htm": "html",
    "xml": "xml",
    "json": "json",
    "yaml": "yaml",
    "yml": "yaml",
    "toml": "toml",
    "md": "markdown",
    "mdx": "markdown",
    "tf": "terraform",
    "hcl": "terraform",
    "dart": "dart",
    "ex": "elixir",
    "exs": "elixir",
    "erl": "erlang",
    "hrl": "erlang",
    "hs": "haskell",
    "lhs": "haskell",
    "clj": "clojure",
    "cljs": "clojure",
    "vue": "vue",
    "svelte": "svelte",
    "graphql": "graphql",
    "gql": "graphql",
    "proto": "protobuf",
    "groovy": "groovy",
    "gradle": "groovy",
    "dockerfile": "dockerfile",
}


def detect_language(file_path: str) -> str:
    """Detect the programming language of a file based on its extension.

    Args:
        file_path: Path to the file (can be absolute or relative).

    Returns:
        Language name string, or "unknown" if not recognized.
    """
    base = os.path.basename(file_path).lower()

    # Handle special filenames with no extension
    special_names: dict[str, str] = {
        "dockerfile": "dockerfile",
        "makefile": "makefile",
        "gemfile": "ruby",
        "rakefile": "ruby",
        "pipfile": "toml",
        "cargo.toml": "toml",
    }
    if base in special_names:
        return special_names[base]

    _, ext = os.path.splitext(base)
    if not ext:
        return "unknown"

    ext = ext.lstrip(".")
    return EXTENSION_MAP.get(ext, "unknown")
