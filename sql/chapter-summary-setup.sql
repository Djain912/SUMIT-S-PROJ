-- Chapter Quick Revision tables (6-section summary + bookmarks)
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS patterns.

CREATE TABLE IF NOT EXISTS "ChapterSummary" (
  "id"          TEXT        NOT NULL PRIMARY KEY,
  "chapterId"   TEXT        NOT NULL UNIQUE,
  "isPublished" BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ChapterSummary_chapterId_fkey"
    FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE
);

-- 6 content sections (added idempotently; old keyPoints column dropped if present)
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "summary"     JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "keyConcepts" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "formulas"    JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "examTips"    JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "highYield"   JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" ADD COLUMN IF NOT EXISTS "oneMinute"   JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChapterSummary" DROP COLUMN IF EXISTS "keyPoints";

CREATE INDEX IF NOT EXISTS "ChapterSummary_chapterId_isPublished_idx"
  ON "ChapterSummary"("chapterId", "isPublished");

CREATE TABLE IF NOT EXISTS "SummaryBookmark" (
  "id"        TEXT        NOT NULL PRIMARY KEY,
  "userId"    TEXT        NOT NULL,
  "chapterId" TEXT        NOT NULL,
  "itemType"  TEXT        NOT NULL,
  "itemIndex" INTEGER     NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SummaryBookmark_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SummaryBookmark_userId_chapterId_itemType_itemIndex_key"
    UNIQUE ("userId", "chapterId", "itemType", "itemIndex")
);

CREATE INDEX IF NOT EXISTS "SummaryBookmark_userId_chapterId_idx"
  ON "SummaryBookmark"("userId", "chapterId");
