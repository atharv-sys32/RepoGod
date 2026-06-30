CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    git_url VARCHAR(1024) NOT NULL,
    default_branch VARCHAR(255) DEFAULT 'main',
    current_commit VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_repositories_user_id ON repositories(user_id);

-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    indexing_status VARCHAR(50) DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repository Files
CREATE TABLE repository_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path VARCHAR(2048) NOT NULL,
    language VARCHAR(50),
    checksum VARCHAR(64),
    last_indexed TIMESTAMP WITH TIME ZONE,
    UNIQUE(repository_id, path)
);
CREATE INDEX idx_repository_files_repo_path ON repository_files(repository_id, path);

-- AST Nodes
CREATE TABLE ast_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES repository_files(id) ON DELETE CASCADE,
    symbol_name VARCHAR(512) NOT NULL,
    symbol_type VARCHAR(100) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_ast_nodes_file_id ON ast_nodes(file_id);
CREATE INDEX idx_ast_nodes_symbol ON ast_nodes(symbol_name, symbol_type);

-- Dependency Edges
CREATE TABLE dependency_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_symbol VARCHAR(512) NOT NULL,
    target_symbol VARCHAR(512) NOT NULL,
    relation_type VARCHAR(100) NOT NULL
);
CREATE INDEX idx_dependency_edges_repo ON dependency_edges(repository_id);

-- Call Graph Edges
CREATE TABLE call_graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    caller VARCHAR(512) NOT NULL,
    callee VARCHAR(512) NOT NULL
);
CREATE INDEX idx_call_graph_edges_repo ON call_graph_edges(repository_id);

-- Embeddings
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    chunk_id VARCHAR(512) NOT NULL,
    content TEXT,
    vector vector(3072),
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_embeddings_repo ON embeddings(repository_id);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    planner_run_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Planner Runs
CREATE TABLE planner_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_prompt TEXT NOT NULL,
    execution_plan JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_planner_runs_conversation ON planner_runs(conversation_id);

-- Planner Steps
CREATE TABLE planner_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_run_id UUID NOT NULL REFERENCES planner_runs(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    latency_ms INTEGER,
    input_summary TEXT,
    output_summary TEXT
);

-- Generated Reviews
CREATE TABLE generated_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_run_id UUID REFERENCES planner_runs(id) ON DELETE SET NULL,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    markdown TEXT,
    severity_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Tests
CREATE TABLE generated_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_run_id UUID REFERENCES planner_runs(id) ON DELETE SET NULL,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    framework VARCHAR(100),
    code TEXT,
    output_path VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artifacts
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    planner_run_id UUID REFERENCES planner_runs(id) ON DELETE SET NULL,
    artifact_type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
