-- Switch from Gemini 3072-dim embedding to local sentence-transformers 384-dim
ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(384);
-- Drop old vector column if it still exists (from V1 schema)
ALTER TABLE embeddings DROP COLUMN IF EXISTS vector;
