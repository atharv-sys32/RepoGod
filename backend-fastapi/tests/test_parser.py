import os
import tempfile

import pytest

from app.parser.language_detector import detect_language
from app.parser.tree_sitter_parser import TreeSitterParser
from app.parser.chunker import SemanticChunker


# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------


class TestDetectLanguage:
    def test_python(self):
        assert detect_language("my_script.py") == "python"

    def test_javascript(self):
        assert detect_language("index.js") == "javascript"

    def test_typescript(self):
        assert detect_language("app.ts") == "typescript"

    def test_tsx(self):
        assert detect_language("Component.tsx") == "typescript"

    def test_java(self):
        assert detect_language("Main.java") == "java"

    def test_go(self):
        assert detect_language("main.go") == "go"

    def test_rust(self):
        assert detect_language("lib.rs") == "rust"

    def test_ruby(self):
        assert detect_language("app.rb") == "ruby"

    def test_cpp(self):
        assert detect_language("vector.cpp") == "c_cpp"

    def test_c(self):
        assert detect_language("main.c") == "c_cpp"

    def test_dockerfile(self):
        assert detect_language("Dockerfile") == "dockerfile"

    def test_unknown(self):
        assert detect_language("archive.bin") == "unknown"

    def test_absolute_path(self):
        assert detect_language("/home/user/project/service.py") == "python"


# ---------------------------------------------------------------------------
# Tree-sitter / regex parser
# ---------------------------------------------------------------------------


class TestTreeSitterParser:
    def setup_method(self):
        self.parser = TreeSitterParser()

    def test_parse_python_classes_and_functions(self):
        source = '''\
class Foo:
    def bar(self):
        pass

def standalone():
    return 42
'''
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as fh:
            fh.write(source)
            path = fh.name

        try:
            nodes = self.parser.parse_file(path, "python")
            names = {n.symbol_name for n in nodes}
            assert "Foo" in names
            assert "bar" in names or "standalone" in names
        finally:
            os.unlink(path)

    def test_parse_typescript_class(self):
        source = '''\
export class UserService {
  constructor(private db: Database) {}

  async getUser(id: string) {
    return this.db.find(id);
  }
}
'''
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".ts", delete=False
        ) as fh:
            fh.write(source)
            path = fh.name

        try:
            nodes = self.parser.parse_file(path, "typescript")
            names = {n.symbol_name for n in nodes}
            assert "UserService" in names
        finally:
            os.unlink(path)

    def test_empty_file_returns_empty(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as fh:
            fh.write("")
            path = fh.name

        try:
            nodes = self.parser.parse_file(path, "python")
            assert nodes == []
        finally:
            os.unlink(path)

    def test_nonexistent_file_returns_empty(self):
        nodes = self.parser.parse_file("/no/such/file.py", "python")
        assert nodes == []

    def test_unsupported_language_returns_empty(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".xyz", delete=False
        ) as fh:
            fh.write("some random content")
            path = fh.name

        try:
            nodes = self.parser.parse_file(path, "unknown")
            assert nodes == []
        finally:
            os.unlink(path)


# ---------------------------------------------------------------------------
# Semantic chunker
# ---------------------------------------------------------------------------


class TestSemanticChunker:
    def setup_method(self):
        self.chunker = SemanticChunker(max_chars=500)

    def test_chunk_with_ast_nodes(self):
        from app.parser.tree_sitter_parser import AstNodeData

        nodes = [
            AstNodeData(
                symbol_name="foo",
                symbol_type="function",
                start_line=1,
                end_line=5,
                content="def foo():\n    return 1\n",
            ),
            AstNodeData(
                symbol_name="bar",
                symbol_type="function",
                start_line=7,
                end_line=10,
                content="def bar():\n    return 2\n",
            ),
        ]
        chunks = self.chunker.chunk_file("/fake/file.py", "python", nodes)
        assert len(chunks) == 2
        assert chunks[0].symbol_name == "foo"
        assert chunks[1].symbol_name == "bar"

    def test_chunk_file_without_nodes_uses_sliding_window(self):
        source = "x = 1\n" * 200  # ~1400 chars
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as fh:
            fh.write(source)
            path = fh.name

        try:
            chunks = self.chunker.chunk_file(path, "python", [])
            assert len(chunks) >= 2
            for chunk in chunks:
                assert len(chunk.content) <= 600  # some slack for overlap
        finally:
            os.unlink(path)

    def test_chunk_metadata_populated(self):
        from app.parser.tree_sitter_parser import AstNodeData

        nodes = [
            AstNodeData(
                symbol_name="MyClass",
                symbol_type="class",
                start_line=1,
                end_line=20,
                content="class MyClass:\n    pass\n",
            )
        ]
        chunks = self.chunker.chunk_file("/project/model.py", "python", nodes)
        assert chunks[0].file_path == "/project/model.py"
        assert chunks[0].language == "python"
        assert chunks[0].symbol_name == "MyClass"
        assert chunks[0].metadata["file_path"] == "/project/model.py"
