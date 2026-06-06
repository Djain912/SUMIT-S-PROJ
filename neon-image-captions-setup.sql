-- ============================================================
-- Run this ONCE in your Neon SQL Editor
-- console.neon.tech → project → SQL Editor → database "neondb" → paste → Run
--
-- Lets admins label note images so the chatbot picks the right diagram.
-- Safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS image_captions (
  url        TEXT        PRIMARY KEY,   -- the image URL (Cloudinary)
  caption    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
