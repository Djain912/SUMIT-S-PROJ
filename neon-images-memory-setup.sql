-- ============================================================
-- Run this ONCE in your Neon SQL Editor
-- console.neon.tech → your project → SQL Editor → paste this → Run
--
-- (This project's database is Neon PostgreSQL. Supabase is only used
--  for login/auth, NOT for storing data.)
--
-- Adds two new chatbot features:
--   1. Images in answers  → image_urls column on knowledge_chunks
--   2. Per-student memory  → user_memory table
-- Safe to run more than once (uses IF NOT EXISTS).
-- ============================================================

-- 1. Let each knowledge chunk remember the image URLs that appeared in it
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 2. Per-student learning profile (one row per user, updated after each chat)
CREATE TABLE IF NOT EXISTS user_memory (
  user_id    TEXT        PRIMARY KEY,   -- matches User.id from Prisma
  profile    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
