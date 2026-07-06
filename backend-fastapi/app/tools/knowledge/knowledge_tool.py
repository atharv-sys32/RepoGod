import os
import re
import subprocess
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.context_engine.engine import ContextEngine
from app.llm.llm_service import LLMService
from app.tools import ToolOutput


class KnowledgeTool:
    """Answers questions about repository code using semantic search + LLM."""

    @staticmethod
    def name() -> str:
        return "knowledge_tool"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        repository_id: uuid.UUID = context["repository_id"]
        engine = ContextEngine()
        llm = LLMService()

        try:
            retrieved_context = await engine.build_context(query, repository_id, db_session)
        except Exception:
            await db_session.rollback()
            retrieved_context = ""

        if len(retrieved_context) > 6000:
            retrieved_context = retrieved_context[:6000] + "\n\n[Context truncated]"

        response_md = await llm.generate(
            system_prompt=ContextEngine.get_system_prompt("knowledge_tool", query),
            user_prompt=query,
            context=retrieved_context,
        )

        artifacts = self._extract_mermaid_artifacts(response_md)

        return ToolOutput(
            markdown=response_md,
            artifacts=artifacts,
            metadata={"tool": self.name(), "query": query},
            confidence=0.9,
        )

    @staticmethod
    def _extract_mermaid_artifacts(markdown: str) -> list[dict[str, Any]]:
        artifacts = []
        pattern = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)
        for idx, match in enumerate(pattern.finditer(markdown)):
            artifacts.append({
                "artifact_type": "mermaid_diagram",
                "title": f"Diagram {idx + 1}",
                "content": match.group(1).strip(),
                "language": "mermaid",
            })
        return artifacts


class CodeInspectorTool:
    """Reads actual file contents from the repository on disk."""

    @staticmethod
    def name() -> str:
        return "code_inspector"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        repository_id: uuid.UUID = context["repository_id"]
        llm = LLMService()

        try:
            result = await db_session.execute(
                text("SELECT file_path, path FROM repository_files WHERE repository_id = :repo_id ORDER BY file_path LIMIT 15"),
                {"repo_id": str(repository_id)},
            )
            rows = result.fetchall()
        except Exception:
            rows = []

        storage = f"/app/repos/{repository_id}"
        snippets = []
        for row in rows:
            fpath = row.file_path or row.path
            full_path = os.path.join(storage, fpath)
            if os.path.isfile(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read(3000)
                    snippets.append(f"### {fpath}\n```\n{content}\n```")
                except OSError:
                    pass

        context_str = "\n\n".join(snippets) if snippets else "No matching files found."

        response = await llm.generate(
            system_prompt="You are a code inspector. Read the code below and answer the query. Reference specific files and line numbers.",
            user_prompt=query,
            context=context_str,
        )
        return ToolOutput(markdown=response, artifacts=[], metadata={"tool": self.name()}, confidence=0.85)


class DocumentationReaderTool:
    """Reads README, docs, and markdown files from the repo."""

    @staticmethod
    def name() -> str:
        return "documentation_reader"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        llm = LLMService()
        repository_id: uuid.UUID = context["repository_id"]
        storage = f"/app/repos/{repository_id}"

        doc_files = []
        if os.path.isdir(storage):
            for root, dirs, files in os.walk(storage):
                dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__")]
                for f in files:
                    if f.lower() in ("readme.md", "readme.txt", "contributing.md", "changelog.md", "license") or \
                       f.endswith((".md", ".rst", ".txt")):
                        doc_files.append(os.path.join(root, f))

        doc_content = []
        for fp in doc_files[:10]:
            rel = os.path.relpath(fp, storage)
            try:
                with open(fp, "r", encoding="utf-8", errors="replace") as fh:
                    content = fh.read(5000)
                doc_content.append(f"## {rel}\n\n{content}")
            except OSError:
                pass

        context_str = "\n\n".join(doc_content) if doc_content else "No documentation files found."
        response = await llm.generate(
            system_prompt="You are a documentation reader. Answer based only on the documentation provided.",
            user_prompt=query,
            context=context_str,
        )
        return ToolOutput(markdown=response, artifacts=[], metadata={"tool": self.name()}, confidence=0.85)


class GitLogTool:
    """Runs `git log` on the cloned repository to get commit history."""

    @staticmethod
    def name() -> str:
        return "git_log"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        repository_id: uuid.UUID = context["repository_id"]
        storage = f"/app/repos/{repository_id}"
        llm = LLMService()

        try:
            result = subprocess.run(
                ["git", "log", "--format=commit: %H%nauthor: %an <%ae>%ndate: %ai%nsubject: %s%n---", "--shortstat", "-200", "--all"],
                cwd=storage,
                capture_output=True,
                text=True,
                timeout=15,
            )
            log_output = result.stdout or result.stderr
        except Exception as e:
            log_output = f"Git log failed: {e}"

        prompt = f"Git history data:\n\n{log_output}\n\nUser query: {query}"
        context_str = f"Git history ({len(log_output.split(chr(10)))} lines):\n{log_output[:12000]}"

        response = await llm.generate(
            system_prompt="You are a git log analyst. For each commit show: short hash, author name, date, subject. Respect 'last N commits' if asked. Be specific about what changed.",
            user_prompt=prompt,
            context=context_str,
        )
        return ToolOutput(
            markdown=response,
            artifacts=[],
            metadata={"tool": self.name(), "commits": log_output.count("\n")},
            confidence=0.9,
        )


class SequenceDiagramGeneratorTool:
    """Generates Mermaid sequence diagrams for code flows."""

    @staticmethod
    def name() -> str:
        return "sequence_diagram_generator"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        repository_id: uuid.UUID = context["repository_id"]
        engine = ContextEngine()
        llm = LLMService()
        try:
            retrieved_context = await engine.build_context(query, repository_id, db_session)
        except Exception:
            await db_session.rollback()
            retrieved_context = ""

        response_md = await llm.generate(
            system_prompt="You generate Mermaid sequence diagrams. Output only the diagram code.",
            user_prompt=query,
            context=retrieved_context,
        )
        return ToolOutput(
            markdown=response_md,
            artifacts=[{
                "artifact_type": "mermaid_diagram",
                "title": "Sequence Diagram",
                "content": response_md.replace("```mermaid", "").replace("```", "").strip(),
                "language": "mermaid",
            }],
            metadata={"tool": self.name(), "query": query},
            confidence=0.85,
        )
