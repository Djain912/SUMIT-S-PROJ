# Security Audit and Content Protection (April 27, 2026)

## Scope Reviewed

- Route protection for `/admin`, `/user`, and API surface under `src/app/api/**`.
- Access control consistency (admin-only and authenticated-user checks).
- Data leakage risks through direct URL access and cache headers.
- Content protection deterrents for notes rendering.
- Watermark controls for protected learning content.

## Findings and Actions

1. Exposed admin upload-signature API was not protected.
- Risk: unauthorized signature generation and media upload abuse.
- Action: Added admin authorization enforcement in `src/app/api/admin/uploads/signature/route.ts`.

2. Public access and shared caching on learning-content APIs (`chapters`, `subtopics`, `notes`).
- Risk: direct URL data scraping and CDN/shared-cache leakage.
- Action: Added authenticated-user checks to:
  - `src/app/api/chapters/route.ts`
  - `src/app/api/chapters/[chapterId]/subtopics/route.ts`
  - `src/app/api/notes/route.ts`
- Action: Changed cache policy to `Cache-Control: private, no-store` on these endpoints.

3. Notes update validation mismatch.
- Risk: update payload rejection and inconsistent API behavior.
- Action: Added `noteUpdateSchema` and applied it in `src/app/api/admin/notes/[id]/route.ts`.

4. Content theft deterrence on notes.
- Action: Added right-click/copy/cut/drag restrictions and inspect-key shortcut blocking on the notes client.
- Action: Added inactivity + tab-switch obfuscation overlay to reduce passive shoulder-surf/screenshot risk.
- Note: Browser-level prevention cannot fully block screenshots or developer tools.

5. Watermark-based redistribution deterrence.
- Action: Added per-note watermark configuration fields in data model and APIs.
- Action: Added admin controls for text, opacity, position, font size, color in notes editor.
- Action: Applied watermark rendering on user notes page (tile/background and positional modes).

## New/Updated Protection Capabilities

- Admin-only upload signature endpoint.
- Authenticated-only content APIs for chapters/subtopics/notes.
- Private/no-store content API caching.
- User-notes anti-copy and anti-inspect deterrence hooks.
- Dynamic obfuscation on idle/tab switch.
- Configurable watermarking managed by admin per note.

## Operational Notes

- Apply DB migration `20260427140000_add_note_watermark_config` in each environment before release.
- Validate anti-copy protections with accessibility requirements in your QA process.
- Continue treating client-side protections as deterrence only, not absolute prevention.
