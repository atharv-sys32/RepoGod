import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import IndexRequest, IndexResponse, RepositoryStatus
from app.models.repository import RepositoryStatus as RepoStatus
from app.services.indexing_service import IndexingService

router = APIRouter(prefix="/api/v1", tags=["indexing"])


async def _run_indexing(repo_id: uuid.UUID, git_url: str) -> None:
    """Background task that runs the full indexing pipeline."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        service = IndexingService()
        await service.index_repository(repo_id, git_url, session)


@router.post("/index", response_model=IndexResponse)
async def index_repository(
    request: IndexRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> IndexResponse:
    """Trigger repository indexing as a background task."""
    from sqlalchemy import select
    from app.models.repository import Repository

    # Verify repo exists
    result = await db.execute(
        select(Repository).where(Repository.id == request.repo_id)
    )
    repo = result.scalar_one_or_none()
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Kick off background indexing
    background_tasks.add_task(_run_indexing, request.repo_id, request.git_url)

    return IndexResponse(
        repo_id=request.repo_id,
        message="Indexing started",
        status=RepoStatus.CLONING.value,
    )


@router.get("/index/{repo_id}/status", response_model=RepositoryStatus)
async def get_index_status(
    repo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> RepositoryStatus:
    """Get current indexing status for a repository."""
    from sqlalchemy import select
    from app.models.repository import Repository

    result = await db.execute(
        select(Repository).where(Repository.id == repo_id)
    )
    repo = result.scalar_one_or_none()
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    return RepositoryStatus(
        repo_id=repo.id,
        status=repo.status.value,
        progress=repo.progress,
        files_indexed=repo.files_indexed,
        total_files=repo.total_files,
    )
