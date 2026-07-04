import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.context_engine.engine import ContextEngine
from app.llm.llm_service import LLMService
from app.prompts.templates import KNOWLEDGE_SYSTEM_PROMPT
from app.tools import ToolOutput


class KnowledgeTool:
    """Answers questions about repository code using semantic search + LLM."""

    @staticmethod
    def name() -> str:
        return "knowledge_tool"

    @staticmethod
    def description() -> str:
        return (
            "Answers questions about the repository: explains code, summarises "
            "architecture, traces data flow, and generates Mermaid diagrams."
        )

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
            system_prompt=KNOWLEDGE_SYSTEM_PROMPT,
            user_prompt=query,
            context=retrieved_context,
        )

        artifacts = self._extract_mermaid_artifacts(response_md)

        return ToolOutput(
            markdown=response_md,
            artifacts=artifacts,
            metadata={
                "tool": self.name(),
                "query": query,
                "context_chunks": retrieved_context.count("### Chunk"),
            },
            confidence=0.9,
        )

    @staticmethod
    def _extract_mermaid_artifacts(markdown: str) -> list[dict[str, Any]]:
        import re

        artifacts = []
        pattern = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)
        for idx, match in enumerate(pattern.finditer(markdown)):
            artifacts.append(
                {
                    "artifact_type": "mermaid_diagram",
                    "title": f"Diagram {idx + 1}",
                    "content": match.group(1).strip(),
                    "language": "mermaid",
                }
            )
        return artifacts


class DocumentationReaderTool:
    """Reads documentation and explains code concepts."""

    @staticmethod
    def name() -> str:
        return "documentation_reader"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        return await KnowledgeTool().execute(context, query, db_session)


class CodeInspectorTool:
    """Inspects specific code implementations."""

    @staticmethod
    def name() -> str:
        return "code_inspector"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        return await KnowledgeTool().execute(context, query, db_session)


class SequenceDiagramGeneratorTool:
    """Generates sequence diagrams for code flows."""

    @staticmethod
    def name() -> str:
        return "sequence_diagram_generator"

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        repo_id: uuid.UUID = context["repository_id"]
        engine = ContextEngine()
        llm = LLMService()
        retrieved_context = await engine.build_context(query, repo_id, db_session)
        prompt = f"Generate a Mermaid sequence diagram for: {query}\n\nContext:\n{retrieved_context}"
        response_md = await llm.generate(
            system_prompt="You generate Mermaid sequence diagrams. Output only the diagram code.",
            user_prompt=query,
            context=retrieved_context,
        )
        return ToolOutput(
            markdown=response_md,
            artifacts=[
                {
                    "artifact_type": "mermaid_diagram",
                    "title": "Sequence Diagram",
                    "content": response_md.replace("```mermaid", "").replace("```", "").strip(),
                    "language": "mermaid",
                }
            ],
            metadata={"tool": self.name(), "query": query},
            confidence=0.85,
        )
