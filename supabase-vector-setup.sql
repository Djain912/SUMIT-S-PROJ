-- ============================================================
-- Run this ONCE in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run
-- ============================================================

-- 1. Enable the vector extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge chunks table (stores all embedded CMT content)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  content      TEXT        NOT NULL,
  embedding    vector(1536),
  level        TEXT,                    -- 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', or NULL
  source_type  TEXT        NOT NULL,    -- 'note' or 'pdf'
  source_id    TEXT,                    -- noteId or PDF filename
  chapter_title    TEXT,
  subtopic_title   TEXT,
  image_urls   TEXT[]      DEFAULT '{}', -- image URLs found in the source chunk
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Index for fast level filtering
CREATE INDEX IF NOT EXISTS knowledge_chunks_level_idx
  ON knowledge_chunks (level);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
  ON knowledge_chunks (source_id);

-- 5. Similarity search function (called by the chatbot API)
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding  vector(1536),
  match_threshold  FLOAT   DEFAULT 0.5,
  match_count      INT     DEFAULT 6,
  filter_level     TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  level          TEXT,
  source_type    TEXT,
  chapter_title  TEXT,
  subtopic_title TEXT,
  similarity     FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.level,
    kc.source_type,
    kc.chapter_title,
    kc.subtopic_title,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    (filter_level IS NULL OR kc.level = filter_level OR kc.level IS NULL)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
