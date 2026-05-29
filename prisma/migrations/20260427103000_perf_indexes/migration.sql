-- Performance indexes for common filter + sort paths
CREATE INDEX IF NOT EXISTS "Chapter_level_isDeleted_orderIndex_idx"
ON "Chapter"("level", "isDeleted", "orderIndex");

CREATE INDEX IF NOT EXISTS "Subtopic_chapterId_isDeleted_orderIndex_idx"
ON "Subtopic"("chapterId", "isDeleted", "orderIndex");

CREATE INDEX IF NOT EXISTS "Note_subtopicId_isDeleted_orderIndex_idx"
ON "Note"("subtopicId", "isDeleted", "orderIndex");

CREATE INDEX IF NOT EXISTS "Question_subtopicId_isDeleted_createdAt_idx"
ON "Question"("subtopicId", "isDeleted", "createdAt");
