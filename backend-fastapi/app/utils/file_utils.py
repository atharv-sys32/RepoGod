import os

# Directories and file patterns to ignore during indexing
_IGNORED_DIRS: frozenset[str] = frozenset(
    {
        ".git",
        ".svn",
        ".hg",
        "node_modules",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".tox",
        "dist",
        "build",
        "out",
        ".next",
        ".nuxt",
        ".output",
        "target",          # Rust / Maven
        ".gradle",
        ".idea",
        ".vscode",
        ".vs",
        "venv",
        ".venv",
        "env",
        ".env",
        "site-packages",
        "vendor",
        "coverage",
        ".coverage",
        "__fixtures__",
        "fixtures",
        "migrations",      # DB migration folders are often large and generated
        "storybook-static",
        ".storybook",
    }
)

_IGNORED_EXTENSIONS: frozenset[str] = frozenset(
    {
        # Compiled / binary
        ".pyc", ".pyo", ".pyd",
        ".class", ".jar", ".war", ".ear",
        ".so", ".dylib", ".dll", ".exe", ".obj", ".o", ".a",
        ".wasm",
        # Images
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp",
        ".tiff", ".tif",
        # Video / audio
        ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".wav", ".ogg", ".flac",
        # Archives
        ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
        # Documents
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        # Font files
        ".ttf", ".otf", ".woff", ".woff2", ".eot",
        # Databases / data blobs
        ".db", ".sqlite", ".sqlite3",
        # Lock files (large, generated)
        ".lock",
        # Minified / map files
        ".min.js", ".min.css", ".map",
    }
)

_IGNORED_FILENAMES: frozenset[str] = frozenset(
    {
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "Pipfile.lock",
        "poetry.lock",
        "Cargo.lock",
        "go.sum",
        ".DS_Store",
        "Thumbs.db",
    }
)


def should_ignore(path: str) -> bool:
    """Return True if the path should be excluded from indexing.

    Checks against well-known ignored directories, extensions, and filenames.

    Args:
        path: Absolute or relative filesystem path.

    Returns:
        True if the path should be skipped.
    """
    parts = path.replace("\\", "/").split("/")

    # Check every directory component
    for part in parts:
        if part in _IGNORED_DIRS:
            return True

    basename = os.path.basename(path)

    # Exact filename match
    if basename in _IGNORED_FILENAMES:
        return True

    # Extension match (handle compound extensions like .min.js)
    lower = basename.lower()
    for ext in _IGNORED_EXTENSIONS:
        if lower.endswith(ext):
            return True

    return False


def is_binary(path: str, sample_size: int = 8192) -> bool:
    """Detect whether a file is binary by inspecting its bytes.

    Uses a heuristic: if more than 30% of the sampled bytes are non-text bytes
    (outside printable ASCII / common control chars), the file is binary.

    Args:
        path: Absolute path to the file.
        sample_size: Number of bytes to sample.

    Returns:
        True if the file appears to be binary.
    """
    try:
        with open(path, "rb") as fh:
            chunk = fh.read(sample_size)
    except (OSError, PermissionError):
        return True

    if not chunk:
        return False

    # Bytes that are clearly non-text
    text_characters = (
        set(range(32, 127))   # printable ASCII
        | {9, 10, 13}          # tab, newline, carriage return
        | set(range(128, 256)) # extended ASCII / UTF-8 continuation bytes
    )
    non_text = sum(1 for b in chunk if b not in text_characters)
    return (non_text / len(chunk)) > 0.30


def get_file_extension(path: str) -> str:
    """Return the file extension in lowercase without the leading dot.

    Args:
        path: Filesystem path.

    Returns:
        Extension string (e.g. "py", "ts") or empty string if none.
    """
    _, ext = os.path.splitext(path)
    return ext.lstrip(".").lower()
