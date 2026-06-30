import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.context_engine.engine import ContextEngine
from app.llm.llm_service import LLMService
from app.prompts.templates import REVIEW_SYSTEM_PROMPT
from app.tools import ToolOutput


class ReviewTool:
    """Reviews code from the repository for quality, security, and correctness."""

    @staticmethod
    def name() -> str:
        return "review_tool"

    @staticmethod
    def description() -> str:
        return (
            "Reviews repository code for correctness, security vulnerabilities, "
            "performance issues, and maintainability concerns."
        )

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        """Run the review tool.

        Args:
            context: Must contain ``repository_id`` (uuid.UUID).
            query: The review request (e.g. "review the authentication module").
            db_session: Active async SQLAlchemy session.

        Returns:
            ToolOutput with a structured Markdown review report.
        """
        repository_id: uuid.UUID = context["repository_id"]

        engine = ContextEngine()
        llm = LLMService()

        retrieved_context = await engine.build_context(query, repository_id, db_session)

        review_md = await llm.generate(
            system_prompt=REVIEW_SYSTEM_PROMPT,
            user_prompt=query,
            context=retrieved_context,
        )

        severity_summary = self._extract_severity_summary(review_md)

        artifacts = [
            {
                "artifact_type": "code_review",
                "title": "Code Review Report",
                "content": review_md,
                "language": "markdown",
            }
        ]

        return ToolOutput(
            markdown=review_md,
            artifacts=artifacts,
            metadata={
                "tool": self.name(),
                "query": query,
                "severity_summary": severity_summary,
            },
            confidence=0.85,
        )

    @staticmethod
    def _extract_severity_summary(review_md: str) -> dict[str, int]:
        """Count findings by severity level."""
        import re

        levels = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
        summary: dict[str, int] = {level: 0 for level in levels}
        for level in levels:
            summary[level] = len(re.findall(rf"\[{level}\]", review_md))
        return summary
