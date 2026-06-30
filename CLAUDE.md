# RepoGod Project

## Overview
AI-powered repository intelligence workspace with Spring Boot + FastAPI + React.

## Development
- `docker compose up --build` to run everything
- Spring Boot at :8080, FastAPI at :8000, Frontend at :3000
- PostgreSQL with pgvector at :5432, Redis at :6379

## Build Commands
- Spring Boot: `cd backend-spring && ./gradlew build`
- FastAPI: `cd backend-fastapi && pip install -r requirements.txt && pytest`
- Frontend: `cd frontend && npm ci && npm run build`

## Architecture
- Spring Boot is the API gateway (auth, CRUD, SSE relay)
- FastAPI handles all AI workloads (indexing, planner, tools)
- Frontend is React + Vite + Tailwind with Zustand state
- Communication: Spring Boot <-> FastAPI via REST/WebClient
- Streaming: FastAPI -> Spring Boot -> Frontend via SSE

## Key Patterns
- Package-by-feature (Java)
- LangGraph state machine for planner orchestration (Python)
- Feature-based folder structure (React)
- Constructor injection, DTOs at boundaries, centralized error handling
