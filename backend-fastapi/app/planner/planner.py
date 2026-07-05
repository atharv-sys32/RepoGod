import json
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.context_engine.engine import ContextEngine
from app.llm.llm_service import LLMService
from app.models.schemas import ArtifactOut, PlannerEvent
from app.planner.state import PlannerState
from app.prompts.templates import PLANNER_SYSTEM_PROMPT
from app.tools.knowledge.knowledge_tool import (
    KnowledgeTool,
    DocumentationReaderTool,
    CodeInspectorTool,
    SequenceDiagramGeneratorTool,
)
from app.tools.review.review_tool import ReviewTool
from app.tools.testing.testing_tool import TestingTool
import logging

logger = logging.getLogger(__name__)


@dataclass
class PlannerResult:
    """Final output from the planner pipeline."""

    final_response: str
    artifacts: list[ArtifactOut] = field(default_factory=list)
    events: list[PlannerEvent] = field(default_factory=list)
    error: Optional[str] = None


_TOOL_REGISTRY: dict[str, Any] = {
    "knowledge_tool": KnowledgeTool(),
    "review_tool": ReviewTool(),
    "testing_tool": TestingTool(),
    "documentation_reader": DocumentationReaderTool(),
    "code_inspector": CodeInspectorTool(),
    "sequence_diagram_generator": SequenceDiagramGeneratorTool(),
}


class PlannerOrchestrator:
    """LangGraph-based planner that decomposes and executes user requests."""

    def __init__(self) -> None:
        self._llm = LLMService()
        self._context_engine = ContextEngine()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run(
        self,
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
        db_session: AsyncSession,
    ) -> PlannerResult:
        """Execute the full planner pipeline and return the aggregated result.

        Args:
            prompt: Raw user prompt.
            repository_id: Target repository UUID.
            workspace_id: Target workspace UUID.
            conversation_id: Optional ongoing conversation UUID.
            db_session: Active async SQLAlchemy session.

        Returns:
            PlannerResult with response text, artifacts, and event trace.
        """
        state = self._init_state(prompt, repository_id, workspace_id, conversation_id)
        result_state = await self._execute_graph(state, db_session)
        return self._build_result(result_state)

    async def run_stream(
        self,
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
        db_session: AsyncSession,
    ) -> AsyncIterator[PlannerEvent]:
        """Stream PlannerEvents as the planner progresses through nodes.

        Args:
            prompt: Raw user prompt.
            repository_id: Target repository UUID.
            workspace_id: Target workspace UUID.
            conversation_id: Optional ongoing conversation UUID.
            db_session: Active async SQLAlchemy session.

        Yields:
            PlannerEvent objects in execution order.
        """
        state = self._init_state(prompt, repository_id, workspace_id, conversation_id)

        # detect_intent
        yield PlannerEvent(
            event_type="node_start",
            tool_name="detect_intent",
            status="running",
            message="Detecting intent...",
        )
        state = await self._node_detect_intent(state)
        yield PlannerEvent(
            event_type="node_end",
            tool_name="detect_intent",
            status="completed",
            message=f"Intent: {state.get('intent', 'knowledge')}",
            data={"intent": state.get("intent")},
        )

        # plan
        yield PlannerEvent(
            event_type="node_start",
            tool_name="plan",
            status="running",
            message="Building execution plan...",
        )
        state = await self._node_plan(state)
        yield PlannerEvent(
            event_type="node_end",
            tool_name="plan",
            status="completed",
            message="Plan ready",
            data=state.get("execution_plan"),
        )

        # retrieve_context
        yield PlannerEvent(
            event_type="node_start",
            tool_name="retrieve_context",
            status="running",
            message="Retrieving relevant context from repository...",
        )
        state = await self._node_retrieve_context(state, db_session)
        yield PlannerEvent(
            event_type="node_end",
            tool_name="retrieve_context",
            status="completed",
            message="Context retrieved",
        )

        # execute_tools
        plan = state.get("execution_plan", {})
        steps = plan.get("steps", [])
        for step in steps:
            tool_name = step.get("tool", "knowledge_tool")
            step_query = step.get("query", state.get("user_prompt", ""))
            yield PlannerEvent(
                event_type="tool_start",
                tool_name=tool_name,
                status="running",
                message=f"Running {tool_name}...",
                data={"query": step_query},
            )
        state = await self._node_execute_tools(state, db_session)
        # Yield the last N tool_end events from state events (N = step count)
        all_events = list(state.get("events", []))
        tool_ends = [e for e in all_events if isinstance(e, PlannerEvent) and e.event_type == "tool_end"]
        for e in tool_ends[-len(steps):] if steps else []:
            yield e

        # synthesize
        yield PlannerEvent(
            event_type="node_start",
            tool_name="synthesize",
            status="running",
            message="Synthesizing final response...",
        )
        state = await self._node_synthesize(state)
        yield PlannerEvent(
            event_type="node_end",
            tool_name="synthesize",
            status="completed",
            message="Done",
            data={"response_length": len(state.get("final_response", ""))},
        )

        yield PlannerEvent(
            event_type="assistant_response",
            tool_name=None,
            status="completed",
            message=state.get("final_response", ""),
        )

        yield PlannerEvent(
            event_type="done",
            tool_name=None,
            status="completed",
            message="Pipeline complete",
        )

    # ------------------------------------------------------------------
    # Graph nodes
    # ------------------------------------------------------------------

    async def _node_detect_intent(self, state: PlannerState) -> PlannerState:
        """Classify user intent using the LLM."""
        prompt = state.get("user_prompt", "")
        events = list(state.get("events", []))

        try:
            raw = await self._llm.generate(
                system_prompt=PLANNER_SYSTEM_PROMPT,
                user_prompt=prompt,
            )
            plan_data = self._parse_json_safely(raw)
            intent = plan_data.get("intent", "knowledge")
        except Exception:
            intent = "knowledge"
            plan_data = {}

        events.append(
            PlannerEvent(
                event_type="node_end",
                tool_name="detect_intent",
                status="completed",
                message=f"Detected intent: {intent}",
                data={"intent": intent},
            )
        )
        return {
            **state,
            "intent": intent,
            "_raw_plan": plan_data,
            "events": events,
        }

    async def _node_plan(self, state: PlannerState) -> PlannerState:
        """Build the execution plan from the detected intent."""
        intent = state.get("intent", "knowledge")
        raw_plan = state.get("_raw_plan", {})
        events = list(state.get("events", []))

        if raw_plan and "steps" in raw_plan:
            plan = raw_plan
        else:
            # Default single-step plan
            tool_map = {
                "knowledge": "knowledge_tool",
                "review": "review_tool",
                "testing": "testing_tool",
                "mixed": "knowledge_tool",
            }
            plan = {
                "intent": intent,
                "steps": [
                    {
                        "step": 1,
                        "tool": tool_map.get(intent, "knowledge_tool"),
                        "query": state.get("user_prompt", ""),
                        "rationale": "Single-step plan",
                    }
                ],
            }

        events.append(
            PlannerEvent(
                event_type="node_end",
                tool_name="plan",
                status="completed",
                message=f"Plan: {len(plan.get('steps', []))} step(s)",
                data=plan,
            )
        )
        return {**state, "execution_plan": plan, "events": events}

    async def _node_retrieve_context(
        self, state: PlannerState, db_session: AsyncSession
    ) -> PlannerState:
        """Retrieve code context from the repository."""
        query = state.get("user_prompt", "")
        repo_id_str = state.get("repository_id", "")
        events = list(state.get("events", []))

        try:
            repo_id = uuid.UUID(repo_id_str)
            context = await self._context_engine.build_context(
                query, repo_id, db_session
            )
        except Exception as exc:
            await db_session.rollback()
            context = f"Context retrieval failed: {exc}"
            logger.warning(f"Context retrieval failed: {exc}")

        events.append(
            PlannerEvent(
                event_type="node_end",
                tool_name="retrieve_context",
                status="completed",
                message="Context retrieved successfully",
            )
        )
        return {**state, "retrieved_context": context, "events": events}

    async def _node_execute_tools(
        self, state: PlannerState, db_session: AsyncSession
    ) -> PlannerState:
        """Execute each tool in the plan sequentially."""
        plan = state.get("execution_plan", {})
        steps = plan.get("steps", [])
        repo_id_str = state.get("repository_id", "")
        events = list(state.get("events", []))
        tool_outputs: list[dict[str, Any]] = []

        try:
            repo_id = uuid.UUID(repo_id_str)
        except ValueError:
            repo_id = uuid.UUID(int=0)

        tool_context = {"repository_id": repo_id}

        for step in steps:
            tool_name = step.get("tool", "knowledge_tool")
            step_query = step.get("query", state.get("user_prompt", ""))
            tool = _TOOL_REGISTRY.get(tool_name)

            events.append(
                PlannerEvent(
                    event_type="tool_start",
                    tool_name=tool_name,
                    status="running",
                    message=f"Executing {tool_name}",
                )
            )

            if tool is None:
                logger.warning(f"Unknown tool '{tool_name}', falling back to knowledge_tool")
                tool = _TOOL_REGISTRY.get("knowledge_tool")
                if tool is None:
                    events.append(
                        PlannerEvent(
                            event_type="tool_end",
                            tool_name=tool_name,
                            status="failed",
                            message=f"Unknown tool: {tool_name}",
                        )
                    )
                    continue

            try:
                output = await tool.execute(tool_context, step_query, db_session)
                tool_outputs.append(
                    {
                        "tool": tool_name,
                        "markdown": output.markdown,
                        "artifacts": output.artifacts,
                        "metadata": output.metadata,
                        "confidence": output.confidence,
                    }
                )
                events.append(
                    PlannerEvent(
                        event_type="tool_end",
                        tool_name=tool_name,
                        status="completed",
                        message=f"{tool_name} succeeded",
                    )
                )
            except Exception as exc:
                logger.error(f"Tool {tool_name} failed: {exc}", exc_info=True)
                events.append(
                    PlannerEvent(
                        event_type="tool_end",
                        tool_name=tool_name,
                        status="failed",
                        message=str(exc),
                    )
                )

        return {**state, "tool_outputs": tool_outputs, "events": events}

    async def _node_validate(self, state: PlannerState) -> PlannerState:
        """Check tool outputs for completeness."""
        tool_outputs = state.get("tool_outputs", [])
        events = list(state.get("events", []))
        error = None

        if not tool_outputs:
            error = "No tool outputs produced"
            events.append(
                PlannerEvent(
                    event_type="node_end",
                    tool_name="validate",
                    status="failed",
                    message=error,
                )
            )
        else:
            events.append(
                PlannerEvent(
                    event_type="node_end",
                    tool_name="validate",
                    status="completed",
                    message=f"Validated {len(tool_outputs)} output(s)",
                )
            )

        return {**state, "error": error, "events": events}

    async def _node_synthesize(self, state: PlannerState) -> PlannerState:
        """Combine tool outputs into the final response."""
        tool_outputs = state.get("tool_outputs", [])
        events = list(state.get("events", []))

        if not tool_outputs:
            final_response = (
                "I was unable to generate a response. "
                "Please ensure the repository is indexed and try again."
            )
        elif len(tool_outputs) == 1:
            final_response = tool_outputs[0]["markdown"]
        else:
            parts = []
            for out in tool_outputs:
                parts.append(f"## {out['tool'].replace('_', ' ').title()}\n\n{out['markdown']}")
            final_response = "\n\n---\n\n".join(parts)

        events.append(
            PlannerEvent(
                event_type="node_end",
                tool_name="synthesize",
                status="completed",
                message="Final response ready",
            )
        )
        return {**state, "final_response": final_response, "events": events}

    # ------------------------------------------------------------------
    # Graph execution
    # ------------------------------------------------------------------

    async def _execute_graph(
        self, state: PlannerState, db_session: AsyncSession
    ) -> PlannerState:
        """Run nodes in sequence (LangGraph compile is optional for async)."""
        state = await self._node_detect_intent(state)
        state = await self._node_plan(state)
        state = await self._node_retrieve_context(state, db_session)
        state = await self._node_execute_tools(state, db_session)
        state = await self._node_validate(state)
        state = await self._node_synthesize(state)
        return state

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _init_state(
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
    ) -> PlannerState:
        return PlannerState(
            user_prompt=prompt,
            repository_id=str(repository_id),
            workspace_id=str(workspace_id),
            conversation_id=str(conversation_id) if conversation_id else None,
            events=[],
            tool_outputs=[],
            retrieved_context="",
            current_step=0,
            error=None,
        )

    @staticmethod
    def _parse_json_safely(raw: str) -> dict[str, Any]:
        """Attempt to parse the first JSON object in raw text."""
        import re

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
        raw = re.sub(r"\n?```$", "", raw.strip())
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Try to find a JSON object anywhere in the text
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except json.JSONDecodeError:
                    pass
        return {}

    @staticmethod
    def _build_result(state: PlannerState) -> PlannerResult:
        tool_outputs = state.get("tool_outputs", [])
        all_artifacts: list[ArtifactOut] = []
        for out in tool_outputs:
            for art in out.get("artifacts", []):
                all_artifacts.append(
                    ArtifactOut(
                        artifact_type=art.get("artifact_type", "text"),
                        title=art.get("title"),
                        content=art.get("content", ""),
                        language=art.get("language"),
                    )
                )
        return PlannerResult(
            final_response=state.get("final_response", ""),
            artifacts=all_artifacts,
            events=state.get("events", []),
            error=state.get("error"),
        )
