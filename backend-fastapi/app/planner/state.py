from typing import Any, Optional
from typing_extensions import TypedDict

from app.models.schemas import PlannerEvent


class PlannerState(TypedDict, total=False):
    """Shared state threaded through all LangGraph nodes."""

    # Inputs
    workspace_id: str
    repository_id: str
    conversation_id: Optional[str]
    user_prompt: str

    # Intermediate data
    retrieved_context: str
    execution_plan: dict[str, Any]
    tool_outputs: list[dict[str, Any]]
    previous_context: str

    # Outputs
    final_response: str
    events: list[PlannerEvent]

    # Control
    current_step: int
    error: Optional[str]
    intent: str  # "knowledge" | "review" | "testing" | "mixed"
    forced_tool: Optional[str]
