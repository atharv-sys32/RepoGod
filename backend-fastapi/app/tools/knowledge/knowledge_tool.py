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
        """Run the knowledge tool.

        Args:
            context: Must contain ``repository_id`` (uuid.UUID).
            query: The user's question about the codebase.
            db_session: Active async SQLAlchemy session.

        Returns:
            ToolOutput with markdown answer and optional diagram artifacts.
        """
        repository_id: uuid.UUID = context["repository_id"]

        engine = ContextEngine()
        llm = LLMService()

        retrieved_context = await engine.build_context(query, repository_id, db_session)

        response_md = await llm.generate(
            system_prompt=KNOWLEDGE_SYSTEM_PROMPT,
            user_prompt=query,
            context=retrieved_context,
        )

        # Extract Mermaid diagrams as artifacts
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
        """Pull mermaid code blocks out of the response as artifacts."""
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
