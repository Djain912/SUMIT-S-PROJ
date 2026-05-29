-- Restore fields still required by the Prisma schema and application code.
ALTER TABLE "Chapter"
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Subtopic"
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Backfill order values from the newer numbering columns when available.
UPDATE "Chapter"
SET "orderIndex" = COALESCE("chapterNo", 0)
WHERE "orderIndex" = 0;

UPDATE "Subtopic"
SET "orderIndex" = COALESCE("subtopicNo", 0)
WHERE "orderIndex" = 0;

-- Backfill slugs using title + stable numeric suffixes when present.
UPDATE "Chapter"
SET "slug" = lower(
  regexp_replace(
    trim("title") || CASE WHEN COALESCE("chapterNo", 0) > 0 THEN '-' || "chapterNo"::text ELSE '' END,
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Subtopic"
SET "slug" = lower(
  regexp_replace(
    trim("title") || CASE WHEN COALESCE("subtopicNo", 0) > 0 THEN '-' || "subtopicNo"::text ELSE '' END,
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL OR "slug" = '';

-- Final cleanup to avoid leading/trailing dashes and enforce non-null.
UPDATE "Chapter"
SET "slug" = trim(both '-' from COALESCE(NULLIF("slug", ''), 'chapter-' || left("id", 8)));

UPDATE "Subtopic"
SET "slug" = trim(both '-' from COALESCE(NULLIF("slug", ''), 'subtopic-' || left("id", 8)));

ALTER TABLE "Chapter"
ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "Subtopic"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Chapter_level_slug_key" ON "Chapter"("level", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Subtopic_chapterId_slug_key" ON "Subtopic"("chapterId", "slug");
CREATE INDEX IF NOT EXISTS "Chapter_level_isPublished_orderIndex_idx" ON "Chapter"("level", "isPublished", "orderIndex");
CREATE INDEX IF NOT EXISTS "Chapter_level_isDeleted_orderIndex_idx" ON "Chapter"("level", "isDeleted", "orderIndex");
CREATE INDEX IF NOT EXISTS "Subtopic_chapterId_isPublished_orderIndex_idx" ON "Subtopic"("chapterId", "isPublished", "orderIndex");
CREATE INDEX IF NOT EXISTS "Subtopic_chapterId_isDeleted_orderIndex_idx" ON "Subtopic"("chapterId", "isDeleted", "orderIndex");
