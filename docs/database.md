# Database

## What It Does
Defines all domain entities for curriculum, notes, questions, attempts, reports, and users via Prisma on PostgreSQL.

## Key Files
- prisma/schema.prisma
- src/lib/db/prisma.ts
- prisma/migrations/
- src/server/services/

## Key Models (High Level)
- User
- Chapter
- Subtopic
- Note
- Question + QuestionOption
- QuizAttempt + QuizAttemptItem
- NoteReport + QuestionReport
- MediaAsset

## Key Constraints and Indexing
- Chapter unique key: (level, slug)
- Subtopic unique key: (chapterId, slug)
- Soft-delete pattern via isDeleted + deletedAt is used across content models.
- Multiple read-path indexes exist for level/chapter/subtopic + publish/delete filters.

## Prisma Client
- Singleton pattern in src/lib/db/prisma.ts
- Query logging controlled by LOG_PRISMA_QUERIES env var

## Gotchas
- Duplicate slug writes raise Prisma P2002 (must be handled in UI/server actions).
- directUrl + pooled DATABASE_URL are both configured in schema datasource.
- Production behavior should avoid leaking raw Prisma errors to end users.
