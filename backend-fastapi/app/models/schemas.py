import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field


class IndexRequest(BaseModel):
    repo_id: uuid.UUID
    git_url: str


class ChatRequest(BaseModel):
    prompt: str
    repository_id: uuid.UUID
    workspace_id: uuid.UUID
    conversation_id: Optional[uuid.UUID] = None


class PlannerEvent(BaseModel):
    event_type: str  # "node_start" | "node_end" | "tool_start" | "tool_end" | "error" | "done"
    tool_name: Optional[str] = None
    status: str  # "running" | "completed" | "failed" | "skipped"
    message: str
    data: Optional[Any] = None


class ArtifactOut(BaseModel):
    artifact_type: str
    title: Optional[str] = None
    content: str
    language: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    artifacts: list[ArtifactOut] = Field(default_factory=list)
    planner_trace: list[PlannerEvent] = Field(default_factory=list)


class RepositoryStatus(BaseModel):
    repo_id: uuid.UUID
    status: str
    progress: int
    files_indexed: int
    total_files: int


class IndexResponse(BaseModel):
    repo_id: uuid.UUID
    message: str
    status: str
