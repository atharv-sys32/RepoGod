-- Add columns expected by FastAPI's SQLAlchemy models to repositories
ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS files_indexed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_files INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS local_path TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add repository_id to ast_nodes (FastAPI model has it directly)
ALTER TABLE ast_nodes
    ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS content TEXT;

-- Migrate repository_files to match FastAPI expectations
ALTER TABLE repository_files
    ADD COLUMN IF NOT EXISTS file_path VARCHAR(2048),
    ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS line_count INTEGER;

UPDATE repository_files SET file_path = path WHERE file_path IS NULL;
ALTER TABLE repository_files ALTER COLUMN file_path SET NOT NULL;

-- FastAPI dependency_edges columns
ALTER TABLE dependency_edges
    ADD COLUMN IF NOT EXISTS source_file TEXT,
    ADD COLUMN IF NOT EXISTS target_file TEXT,
    ADD COLUMN IF NOT EXISTS import_name TEXT,
    ADD COLUMN IF NOT EXISTS edge_type VARCHAR(50);

UPDATE dependency_edges SET source_file = source_symbol, target_file = target_symbol, edge_type = relation_type;

-- FastAPI call_graph_edges columns
ALTER TABLE call_graph_edges
    ADD COLUMN IF NOT EXISTS caller_symbol VARCHAR(512),
    ADD COLUMN IF NOT EXISTS callee_symbol VARCHAR(512),
    ADD COLUMN IF NOT EXISTS caller_file TEXT,
    ADD COLUMN IF NOT EXISTS callee_file TEXT;

UPDATE call_graph_edges SET caller_symbol = caller, callee_symbol = callee;

-- FastAPI Embedding model columns
ALTER TABLE embeddings
    ADD COLUMN IF NOT EXISTS embedding vector(3072),
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS symbol_name TEXT,
    ADD COLUMN IF NOT EXISTS start_line INTEGER,
    ADD COLUMN IF NOT EXISTS end_line INTEGER,
    ADD COLUMN IF NOT EXISTS language TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Copy vector data to embedding column where embedding is null
UPDATE embeddings SET embedding = vector WHERE embedding IS NULL AND vector IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ast_nodes_repo_id ON ast_nodes(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_files_file_path ON repository_files(repository_id, file_path);
