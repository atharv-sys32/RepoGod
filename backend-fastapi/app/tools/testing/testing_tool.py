import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.context_engine.engine import ContextEngine
from app.llm.llm_service import LLMService
from app.prompts.templates import TESTING_SYSTEM_PROMPT
from app.tools import ToolOutput


class TestingTool:
    """Generates tests for repository code."""

    @staticmethod
    def name() -> str:
        return "testing_tool"

    @staticmethod
    def description() -> str:
        return (
            "Generates comprehensive unit, integration, and edge-case tests "
            "for repository code in the appropriate language and test framework."
        )

    async def execute(
        self,
        context: dict[str, Any],
        query: str,
        db_session: AsyncSession,
    ) -> ToolOutput:
        """Run the testing tool.

        Args:
            context: Must contain ``repository_id`` (uuid.UUID).
            query: The test generation request.
            db_session: Active async SQLAlchemy session.

        Returns:
            ToolOutput containing generated test code as a code artifact.
        """
        repository_id: uuid.UUID = context["repository_id"]

        engine = ContextEngine()
        llm = LLMService()

        retrieved_context = await engine.build_context(query, repository_id, db_session)

        test_response = await llm.generate(
            system_prompt=TESTING_SYSTEM_PROMPT,
            user_prompt=query,
            context=retrieved_context,
        )

        # Extract language from context for artifact metadata
        language = self._infer_language(retrieved_context)
        test_code, test_count = self._extract_test_code(test_response)

        artifacts = [
            {
                "artifact_type": "generated_tests",
                "title": "Generated Tests",
                "content": test_code or test_response,
                "language": language,
            }
        ]

        return ToolOutput(
            markdown=test_response,
            artifacts=artifacts,
            metadata={
                "tool": self.name(),
                "query": query,
                "language": language,
                "test_count": test_count,
            },
            confidence=0.88,
        )

    @staticmethod
    def _infer_language(context: str) -> str:
        """Best-effort language detection from context metadata."""
        import re

        m = re.search(r"\*\*Language:\*\*\s*`?(\w+)`?", context)
        if m:
            return m.group(1)
        # Fallback: look for code fence language hints
        m = re.search(r"```(\w+)", context)
        if m:
            lang = m.group(1)
            if lang not in ("mermaid", "markdown", "text", ""):
                return lang
        return "python"

    @staticmethod
    def _extract_test_code(response: str) -> tuple[str, int]:
        """Extract code from fenced blocks and count test functions."""
        import re

        # Gather all code blocks
        blocks = re.findall(r"```(?:\w+)?\n(.*?)```", response, re.DOTALL)
        code = "\n\n".join(blocks) if blocks else response

        # Count test functions (pytest style or jest style)
        test_count = len(
            re.findall(r"(?:def test_|it\(|test\(|@Test)", code)
        )
        return code, test_count
