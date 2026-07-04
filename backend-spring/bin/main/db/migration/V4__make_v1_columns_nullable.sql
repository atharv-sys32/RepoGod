-- Make old V1 "path" column nullable since FastAPI uses "file_path" now
ALTER TABLE repository_files ALTER COLUMN path DROP NOT NULL;

-- Make old V1 foreign key columns nullable since FastAPI uses new ones
ALTER TABLE dependency_edges ALTER COLUMN source_symbol DROP NOT NULL;
ALTER TABLE dependency_edges ALTER COLUMN target_symbol DROP NOT NULL;
ALTER TABLE dependency_edges ALTER COLUMN relation_type DROP NOT NULL;
ALTER TABLE call_graph_edges ALTER COLUMN caller DROP NOT NULL;
ALTER TABLE call_graph_edges ALTER COLUMN callee DROP NOT NULL;
