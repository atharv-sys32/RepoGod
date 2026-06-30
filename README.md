# RepoGod

An AI-powered repository intelligence workspace. Import any Git repository, build rich semantic indexes (AST, dependency graphs, call graphs, embeddings), and interact with your codebase through an intelligent Planner that orchestrates Knowledge, Review, and Testing tools.

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  React   │────▶│  Spring Boot │────▶│   FastAPI     │
│ Frontend │ API │   Gateway    │ REST│  AI Service   │
│  (Vite)  │◀────│   + Auth     │◀────│  + LangGraph  │
└──────────┘ SSE └──────┬───────┘     └──────┬────────┘
                        │                     │
                   ┌────▼────┐          ┌─────▼─────┐
                   │PostgreSQL│          │  Gemini   │
                   │+pgvector │          │   API     │
                   └────┬────┘          └───────────┘
                        │
                   ┌────▼────┐
                   │  Redis  │
                   └─────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, React Query |
| Core Backend | Spring Boot 3.3 (Java 21), Spring Security, JWT, JPA, Flyway |
| AI Backend | FastAPI (Python 3.12), LangGraph, LangChain, Google Gemini, Tree-sitter |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Infrastructure | Docker Compose, Nginx, GitHub Actions |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) Java 21, Python 3.12, Node.js 20 for local dev

### Run with Docker Compose

```bash
cp .env.example .env
# Edit .env and set your GOOGLE_API_KEY

docker compose up --build
```

Services start at:
- **Frontend:** http://localhost:3000
- **Spring Boot API:** http://localhost:8080
- **FastAPI AI Service:** http://localhost:8000
- **Full stack via Nginx:** http://localhost

### Local Development

**Spring Boot:**
```bash
cd backend-spring
./gradlew bootRun
```

**FastAPI:**
```bash
cd backend-fastapi
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login, returns JWT

### Workspaces
- `POST /api/v1/workspaces` — Create workspace
- `GET /api/v1/workspaces` — List user workspaces
- `GET /api/v1/workspaces/{id}` — Get workspace
- `DELETE /api/v1/workspaces/{id}` — Delete workspace

### Repositories
- `POST /api/v1/repositories/import` — Import (clone) a repository
- `POST /api/v1/repositories/{id}/index` — Start indexing
- `GET /api/v1/repositories/{id}/status` — Indexing progress
- `GET /api/v1/repositories` — List repositories

### Chat
- `POST /api/v1/chat` — Send message (sync)
- `GET /api/v1/chat/stream` — SSE streaming endpoint

### Conversations
- `GET /api/v1/conversations?workspaceId=` — List conversations
- `GET /api/v1/conversations/{id}/messages` — Message history

### Planner
- `GET /api/v1/planner-runs/{id}` — Planner execution trace

### Artifacts
- `GET /api/v1/artifacts/{id}` — Download artifact

## Project Structure

```
RepoGod/
├── docker-compose.yml
├── nginx/
├── .github/workflows/ci.yml
├── backend-spring/          # Java 21 / Spring Boot 3.3
│   ├── build.gradle
│   └── src/main/java/com/repogod/
│       ├── auth/            # JWT authentication
│       ├── workspace/       # Workspace CRUD
│       ├── repository/      # Repository import & management
│       ├── conversation/    # Chat history persistence
│       ├── planner/         # Planner run tracking
│       ├── gateway/         # WebClient proxy to FastAPI
│       ├── streaming/       # SSE chat streaming
│       ├── common/          # Exception handling, DTOs
│       └── persistence/     # Artifacts
├── backend-fastapi/         # Python 3.12 / FastAPI
│   └── app/
│       ├── api/             # REST endpoints
│       ├── planner/         # LangGraph state machine
│       ├── tools/           # Knowledge, Review, Testing
│       ├── context_engine/  # Unified context retrieval
│       ├── parser/          # Tree-sitter + chunking
│       ├── embeddings/      # Gemini embeddings + pgvector
│       ├── retrieval/       # Vector + graph retrieval
│       ├── llm/             # LLM service wrapper
│       └── prompts/         # Prompt templates
└── frontend/                # React 18 + TypeScript + Vite
    └── src/
        ├── pages/           # Login, Dashboard, Workspace
        ├── features/        # Chat, Planner, Repository, Artifacts
        ├── components/      # UI primitives
        ├── services/        # API clients
        ├── hooks/           # Custom React hooks
        └── store/           # Zustand state
```

## Key Features

- **Repository Indexing:** Clone repos, parse with Tree-sitter, build AST/dependency/call graphs, generate vector embeddings
- **AI Planner:** LangGraph state machine that detects intent, plans tool execution, retrieves context, runs tools, and synthesizes responses
- **Knowledge Tool:** Answer repository questions, generate Mermaid diagrams, explain architecture
- **Review Tool:** AI-powered code review (correctness, security, performance, maintainability)
- **Testing Tool:** Generate meaningful tests with edge cases
- **Real-time Streaming:** SSE-based planner progress and chat streaming
- **Conversation Persistence:** Resume any workspace and conversation

## Database Schema

Full schema defined in `backend-spring/src/main/resources/db/migration/V1__initial_schema.sql` — includes 16 tables covering users, repositories, workspaces, AST nodes, dependency/call graphs, embeddings, conversations, planner runs, and generated artifacts.

## Git Workflow

- `main` — production
- `develop` — integration
- `feature/*` — feature branches
- `fix/*` — bug fixes
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `perf:`, `chore:`
