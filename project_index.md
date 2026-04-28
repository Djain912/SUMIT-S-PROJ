# Project Overview

## Purpose
Finance Exam Platform for creating and managing curriculum content (chapters, subtopics, notes, questions), running quizzes, and tracking learner performance.

## Tech Stack
- Next.js 15 (App Router, Server Components + Client Components)
- React 19 + TypeScript
- Prisma ORM
- Supabase Auth + PostgreSQL
- Tailwind CSS
- Upstash Redis (rate limiting)

## Key Modules
- Auth
  - src/server/policies/auth.ts
  - src/lib/auth/supabase.ts
- Database
  - src/lib/db/prisma.ts
  - prisma/schema.prisma
- Admin Dashboard
  - src/app/(dashboard)/admin/
  - src/components/admin/
- API Layer
  - src/app/api/

## Data Flow
1. User action in UI
2. Next.js route handler or Server Action
3. Validation and policy checks (auth/csrf/rate-limit)
4. Prisma query/mutation
5. PostgreSQL (Supabase)
6. JSON response or revalidated page render

## Where Things Live
- API routes: src/app/api/
- DB schema: prisma/schema.prisma
- Prisma client: src/lib/db/prisma.ts
- Auth policies: src/server/policies/
- Server services: src/server/services/
- Validators: src/server/validators/
- UI components: src/components/
- Admin pages: src/app/(dashboard)/admin/

## Current Task Context
Update this block before asking Claude anything.

- Goal:
- Scope:
- Files likely involved:
- Constraints:
- Expected output:
- Validation command(s):
- Known errors/logs:
