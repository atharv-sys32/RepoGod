import asyncio
import json
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import ChatRequest, ChatResponse, PlannerEvent
from app.planner.planner import PlannerOrchestrator

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Run the planner and return the full result."""
    orchestrator = PlannerOrchestrator()
    result = await orchestrator.run(
        prompt=request.prompt,
        repository_id=request.repository_id,
        workspace_id=request.workspace_id,
        conversation_id=request.conversation_id,
        db_session=db,
    )
    return ChatResponse(
        response=result.final_response,
        artifacts=result.artifacts,
        planner_trace=result.events,
    )


async def _event_stream(
    prompt: str,
    repository_id: uuid.UUID,
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
) -> AsyncIterator[str]:
    """Generate SSE events from the planner stream."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        orchestrator = PlannerOrchestrator()
        async for event in orchestrator.run_stream(
            prompt=prompt,
            repository_id=repository_id,
            workspace_id=workspace_id,
            conversation_id=conversation_id,
            db_session=session,
        ):
            payload = event.model_dump()
            # Emit planner events as standard SSE
            yield f"event: message\n"
            yield f"data: {json.dumps(payload)}\n\n"

            # Also forward the final response text as chunk events
            if event.event_type == "assistant_response" and event.message:
                yield f"event: chunk\ndata: {json.dumps({'text': event.message})}\n\n"

            await asyncio.sleep(0)  # yield control

        yield f"event: done\ndata: [DONE]\n\n"


@router.get("/chat/stream")
async def chat_stream(
    prompt: str,
    repository_id: uuid.UUID,
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID | None = None,
) -> StreamingResponse:
    """Stream planner events as Server-Sent Events."""
    return StreamingResponse(
        _event_stream(prompt, repository_id, workspace_id, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
