import json
import os
import re
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
    GitLogTool,
    SequenceDiagramGeneratorTool,
)
from app.tools.review.review_tool import ReviewTool
from app.tools.testing.testing_tool import TestingTool
import logging

logger = logging.getLogger(__name__)

@dataclass
class PlannerResult:
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
    "git_log": GitLogTool(),
    "sequence_diagram_generator": SequenceDiagramGeneratorTool(),
}

# In-memory conversation memory: conv_id -> last response text
_conversation_memory: dict[str, str] = {}


def _decompose_query(query: str) -> list[str]:
    """Split complex queries into sub-queries (max 3)."""
    q = query.lower().strip()
    if any(w in q for w in [" and ", " also ", " then "]):
        parts = re.split(r'\s+(?:and|also|then)\s+', q)
        parts = [p.strip() for p in parts if len(p.split()) > 2]
        if len(parts) >= 2:
            return parts[:3]
    sentences = [s.strip() for s in re.split(r'[.?]\s*(?=[A-Z])', q) if s.strip()]
    if len(sentences) >= 3:
        return sentences[:3]
    return [query]


class PlannerOrchestrator:
    def __init__(self) -> None:
        self._llm = LLMService()
        self._context_engine = ContextEngine()

    async def run(
        self,
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
        db_session: AsyncSession,
    ) -> PlannerResult:
        state = self._init_state(prompt, repository_id, workspace_id, conversation_id)
        result_state = await self._execute_graph(state, db_session)
        result = self._build_result(result_state)
        # Store in memory
        if conversation_id:
            _conversation_memory[str(conversation_id)] = result.final_response
        return result

    async def run_stream(
        self,
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
        db_session: AsyncSession,
    ) -> AsyncIterator[PlannerEvent]:
        sub_queries = _decompose_query(prompt)
        for i, sub_query in enumerate(sub_queries):
            if i > 0:
                yield PlannerEvent(
                    event_type="node_start", tool_name="sub_query",
                    status="running", message=f"Part {i+1} of {len(sub_queries)}",
                )

            state = self._init_state(sub_query, repository_id, workspace_id, conversation_id)

            # Load previous context from memory
            if conversation_id:
                prev = _conversation_memory.get(str(conversation_id), "")
                if prev:
                    state["previous_context"] = prev

            # detect_intent
            yield PlannerEvent(
                event_type="node_start", tool_name="detect_intent",
                status="running", message="Detecting intent...",
            )
            state = await self._node_detect_intent(state)
            yield PlannerEvent(
                event_type="node_end", tool_name="detect_intent",
                status="completed", message=f"Intent: {state.get('intent', 'knowledge')}",
                data={"intent": state.get("intent")},
            )

            # plan
            yield PlannerEvent(
                event_type="node_start", tool_name="plan",
                status="running", message="Building execution plan...",
            )
            state = await self._node_plan(state)
            yield PlannerEvent(
                event_type="node_end", tool_name="plan",
                status="completed", message="Plan ready",
                data=state.get("execution_plan"),
            )

            # retrieve_context
            yield PlannerEvent(
                event_type="node_start", tool_name="retrieve_context",
                status="running", message="Retrieving relevant context from repository...",
            )
            state = await self._node_retrieve_context(state, db_session)
            yield PlannerEvent(
                event_type="node_end", tool_name="retrieve_context",
                status="completed", message="Context retrieved",
            )

            # execute_tools
            plan = state.get("execution_plan", {})
            steps = plan.get("steps", [])
            for step in steps:
                tool_name = step.get("tool", "knowledge_tool")
                step_query = step.get("query", state.get("user_prompt", ""))
                yield PlannerEvent(
                    event_type="tool_start", tool_name=tool_name,
                    status="running", message=f"Running {tool_name}...",
                    data={"query": step_query},
                )
            state = await self._node_execute_tools(state, db_session)
            all_events = list(state.get("events", []))
            tool_ends = [e for e in all_events if isinstance(e, PlannerEvent) and e.event_type == "tool_end"]
            for e in tool_ends[-len(steps):] if steps else []:
                yield e

            # synthesize
            yield PlannerEvent(
                event_type="node_start", tool_name="synthesize",
                status="running", message="Synthesizing final response...",
            )
            state = await self._node_synthesize(state)
            yield PlannerEvent(
                event_type="node_end", tool_name="synthesize",
                status="completed", message="Done",
                data={"response_length": len(state.get("final_response", ""))},
            )

            yield PlannerEvent(
                event_type="assistant_response", tool_name=None,
                status="completed", message=state.get("final_response", ""),
            )

            yield PlannerEvent(
                event_type="done", tool_name=None,
                status="completed", message="Pipeline complete",
            )

    # ------------------------------------------------------------------
    # Graph nodes
    # ------------------------------------------------------------------

    async def _node_detect_intent(self, state: PlannerState) -> PlannerState:
        query = state.get("user_prompt", "")
        events = list(state.get("events", []))
        import json as _json
        prev_context = state.get("previous_context", "")
        ctx = f"\nPrevious conversation context: {prev_context[:200]}" if prev_context else ""
        try:
            response = await self._llm.generate(
                system_prompt=(
                    "You classify codebase queries into tool categories. "
                    "Available tools and when to use them:\n"
                    "- git_log: questions about commits, git history, changelog, what changed\n"
                    "- knowledge_tool: explain code, describe architecture, answer how/what/why questions\n"
                    "- code_inspector: show file contents, inspect specific code, read source\n"
                    "- documentation_reader: read README, docs, markdown\n"
                    "- review_tool: review code, find bugs, security issues\n"
                    "- testing_tool: generate tests\n"
                    "- sequence_diagram_generator: draw sequence diagrams\n\n"
                    "Consider the full conversation context, not just the latest message. "
                    "A follow-up like 'tell me more about that commit' refers to the previously mentioned git commit.\n"
                    "Reply ONLY with JSON: {\"tool\": \"<tool_name>\"}" + ctx
                ),
                user_prompt=query,
            )
            cleaned = re.sub(r"```(?:json)?\s*", "", response).strip()
            plan_data = _json.loads(cleaned)
            intent = "mixed"  # We'll use the tool directly
            forced_tool = plan_data.get("tool", "knowledge_tool")
        except Exception:
            intent = "knowledge"
            forced_tool = None

        events.append(PlannerEvent(event_type="node_end", tool_name="detect_intent",
                                    status="completed", message=f"Intent: {intent}",
                                    data={"intent": intent}))
        return {**state, "intent": intent, "forced_tool": forced_tool, "_raw_plan": {}, "events": events}

    async def _node_plan(self, state: PlannerState) -> PlannerState:
        intent = state.get("intent", "knowledge")
        forced_tool = state.get("forced_tool")
        raw_plan = state.get("_raw_plan", {})
        query = state.get("user_prompt", "").lower()
        events = list(state.get("events", []))
        if raw_plan and "steps" in raw_plan:
            plan = raw_plan
        else:
            tool_map = {
                "knowledge": forced_tool or "knowledge_tool",
                "review": "review_tool",
                "testing": "testing_tool",
                "mixed": forced_tool or "knowledge_tool",
            }
            chosen_tool = tool_map.get(intent, forced_tool or "knowledge_tool")

            plan = {
                "intent": intent,
                "steps": [{
                    "step": 1,
                    "tool": chosen_tool,
                    "query": state.get("user_prompt", ""),
                    "rationale": "LLM-classified",
                }],
            }
        events.append(PlannerEvent(event_type="node_end", tool_name="plan",
                                    status="completed", message=f"Plan: {len(plan.get('steps', []))} step(s)",
                                    data=plan))
        return {**state, "execution_plan": plan, "events": events}

    async def _node_retrieve_context(self, state: PlannerState, db_session: AsyncSession) -> PlannerState:
        query = state.get("user_prompt", "")
        repo_id_str = state.get("repository_id", "")
        events = list(state.get("events", []))
        context = ""
        try:
            repo_id = uuid.UUID(repo_id_str)
            context = await self._context_engine.build_context(query, repo_id, db_session)
        except Exception as exc:
            await db_session.rollback()
            context = f"Context retrieval failed: {exc}"
            logger.warning(f"Context retrieval failed: {exc}")
        events.append(PlannerEvent(event_type="node_end", tool_name="retrieve_context",
                                    status="completed", message="Context retrieved successfully"))
        return {**state, "retrieved_context": context, "events": events}

    async def _node_execute_tools(self, state: PlannerState, db_session: AsyncSession) -> PlannerState:
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
            events.append(PlannerEvent(event_type="tool_start", tool_name=tool_name,
                                        status="running", message=f"Executing {tool_name}"))
            if tool is None:
                logger.warning(f"Unknown tool '{tool_name}', falling back to knowledge_tool")
                tool = _TOOL_REGISTRY.get("knowledge_tool")
                if tool is None:
                    events.append(PlannerEvent(event_type="tool_end", tool_name=tool_name,
                                                status="failed", message=f"Unknown tool: {tool_name}"))
                    continue
            try:
                output = await tool.execute(tool_context, step_query, db_session)
                tool_outputs.append({
                    "tool": tool_name,
                    "markdown": output.markdown,
                    "artifacts": output.artifacts,
                    "metadata": output.metadata,
                    "confidence": output.confidence,
                })
                events.append(PlannerEvent(event_type="tool_end", tool_name=tool_name,
                                            status="completed", message=f"{tool_name} succeeded"))
            except Exception as exc:
                logger.error(f"Tool {tool_name} failed: {exc}", exc_info=True)
                events.append(PlannerEvent(event_type="tool_end", tool_name=tool_name,
                                            status="failed", message=str(exc)))
        return {**state, "tool_outputs": tool_outputs, "events": events}

    async def _node_validate(self, state: PlannerState) -> PlannerState:
        tool_outputs = state.get("tool_outputs", [])
        events = list(state.get("events", []))
        error = None
        if not tool_outputs:
            error = "No tool outputs produced"
            events.append(PlannerEvent(event_type="node_end", tool_name="validate",
                                        status="failed", message=error))
        else:
            events.append(PlannerEvent(event_type="node_end", tool_name="validate",
                                        status="completed", message=f"Validated {len(tool_outputs)} output(s)"))
        return {**state, "error": error, "events": events}

    async def _node_synthesize(self, state: PlannerState) -> PlannerState:
        tool_outputs = state.get("tool_outputs", [])
        events = list(state.get("events", []))
        prev_context = state.get("previous_context", "")

        if not tool_outputs:
            final_response = ("I was unable to generate a response. "
                              "Please ensure the repository is indexed and try again.")
        elif len(tool_outputs) == 1:
            final_response = tool_outputs[0]["markdown"]
        else:
            parts = []
            for out in tool_outputs:
                parts.append(f"## {out['tool'].replace('_', ' ').title()}\n\n{out['markdown']}")
            final_response = "\n\n---\n\n".join(parts)

        # Prepend follow-up context if available
        if prev_context:
            final_response = f"[Based on previous context]\n\n{final_response}"

        events.append(PlannerEvent(event_type="node_end", tool_name="synthesize",
                                    status="completed", message="Final response ready"))
        return {**state, "final_response": final_response, "events": events}

    async def _execute_graph(self, state: PlannerState, db_session: AsyncSession) -> PlannerState:
        state = await self._node_detect_intent(state)
        state = await self._node_plan(state)
        state = await self._node_retrieve_context(state, db_session)
        state = await self._node_execute_tools(state, db_session)
        state = await self._node_validate(state)
        state = await self._node_synthesize(state)
        return state

    def _build_result(self, state: PlannerState) -> PlannerResult:
        final_response = state.get("final_response", "")
        events = list(state.get("events", []))
        error = state.get("error")
        return PlannerResult(final_response=final_response, events=events, error=error)

    def _init_state(
        self,
        prompt: str,
        repository_id: uuid.UUID,
        workspace_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
    ) -> PlannerState:
        return {
            "user_prompt": prompt,
            "repository_id": str(repository_id),
            "workspace_id": str(workspace_id),
            "conversation_id": str(conversation_id) if conversation_id else None,
            "intent": "knowledge",
            "retrieved_context": "",
            "execution_plan": {},
            "tool_outputs": [],
            "previous_context": "",
            "forced_tool": None,
            "events": [],
            "current_step": 0,
            "error": None,
            "final_response": "",
        }
