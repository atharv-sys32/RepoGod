from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ToolOutput:
    """Standardised output from any RepoGod tool."""

    markdown: str
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0


from app.tools.knowledge.knowledge_tool import KnowledgeTool
from app.tools.review.review_tool import ReviewTool
from app.tools.testing.testing_tool import TestingTool

__all__ = ["ToolOutput", "KnowledgeTool", "ReviewTool", "TestingTool"]
