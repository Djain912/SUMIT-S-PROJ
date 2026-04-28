# Frontend

## What It Does
Renders admin and learner experiences with App Router pages, mixed Server/Client components, and API-backed interactions.

## Key Files
- src/app/layout.tsx
- src/app/page.tsx
- src/app/(dashboard)/admin/*
- src/components/admin/*
- src/components/user/*
- src/components/quiz/*

## Key Flows
- Admin content management:
  - Chapters/Subtopics pages use forms + server actions/routes
  - Notes/Questions pages use client components with fetch-based CRUD
- Learner flow:
  - Dashboard -> chapters/subtopics -> notes/quiz
- Shared behavior:
  - role-based access via admin layout auth gate

## Gotchas
- Passing inline/nested server action closures can trigger function serialization errors.
- Keep Server Action signatures simple and prefer top-level action functions when possible.
- Mixed server-render + client fetch patterns can produce stale UI unless revalidation/refetch is explicit.
- Rich-text JSON/HTML rendering should tolerate legacy content formats.
