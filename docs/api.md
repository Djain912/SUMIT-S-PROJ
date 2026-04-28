# API

## What It Does
Provides route handlers for admin CRUD, learner quiz flows, content reads, uploads, reports, auth session actions, and dashboard analytics.

## Key Files
- src/app/api/admin/*
- src/app/api/chapters/*
- src/app/api/notes/*
- src/app/api/quizzes/*
- src/app/api/user/*
- src/server/policies/auth.ts
- src/server/policies/csrf.ts
- src/server/policies/rate-limit.ts

## Key Patterns
- Most admin mutation routes enforce:
  - requireAdminUser()
  - validateCsrfOrigin(request)
  - enforceRateLimit(...)
- Common response shape:
  - { success: true, data, meta? }
  - { success: false, error: { message } }
- Pagination used on list endpoints with page/limit/total/totalPages metadata.

## Gotchas
- Admin list endpoints should include non-deleted content; draft filtering must be intentional.
- Route behavior and Server Action behavior can diverge if both exist for same domain action.
- Revalidation strategy matters for admin UX (manual refresh issues happen when invalidation is missing).
- Keep route error messages user-safe; log internals server-side only.
