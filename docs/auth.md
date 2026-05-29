# Auth

## What It Does
Handles user authentication and admin authorization using Supabase session identity plus local user records in PostgreSQL.

## Key Files
- src/server/policies/auth.ts
- src/lib/auth/supabase.ts
- src/app/(dashboard)/admin/layout.tsx
- src/app/api/auth/

## Key Functions
- requireAuthenticatedUser()
  - Resolves current Supabase user.
  - Syncs/creates user in Prisma.
  - Returns normalized session user.
- requireAdminUser()
  - Enforces admin-only access.
  - Depends on SUPER_ADMIN_EMAIL/ADMIN_EMAIL env config.
- createSupabaseServerClient()
  - Creates server-side Supabase client for auth operations.

## Gotchas
- SUPER_ADMIN_EMAIL must be configured, otherwise admin access fails by design.
- Admin routes typically guard at layout level and/or route level.
- Temporary in-memory auth cache exists (sessionCache with TTL) to reduce repeated lookups.
- Prisma init/auth errors are handled with fallback user shape in specific auth paths.
