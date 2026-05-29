# Architecture Overview

## 1. Product Summary
This platform is a production-ready finance exam preparation system for CMT, stock market, and related certifications. The design prioritizes modularity, content scalability, quiz performance, and secure access control.

## 2. Confirmed Technology Stack
- Frontend: Next.js App Router
- Styling: Tailwind CSS + shadcn/ui
- Backend: Next.js API routes in a modular structure
- Database: PostgreSQL via Supabase
- ORM: Prisma
- Authentication: Supabase Auth with Google and Email/Password
- Storage: Cloudinary for images and PDFs
- Security: Cloudflare and Google reCAPTCHA

## 3. Core Architecture Principles
- Keep content, quiz logic, and user progress separate.
- Use a domain-driven folder structure so features can scale independently.
- Keep API routes thin and move business rules into services.
- Model quizzes for flexible topic selection without duplicating content.
- Optimize reads for learners and writes for admins.

## 4. System Modules

### 4.1 Authentication System
Responsibilities:
- Sign in with Google
- Sign in with email and password
- Password reset flow
- Session handling through Supabase Auth
- Protect admin and premium routes

Implementation notes:
- Use Supabase Auth for identity and session issuance.
- Mirror the authenticated user in the application database for profile, role, and access metadata.
- Use middleware for route protection and role-based redirects.

### 4.2 Admin Dashboard
Responsibilities:
- Manage chapters and subtopics
- Create and edit notes
- Upload PDFs and images
- Build quizzes and questions
- Review content metadata and usage

Implementation notes:
- Restrict access to admin role only.
- Use shadcn/ui forms, dialogs, and tables.
- Keep content editing server-driven, with validation on the API layer.

### 4.3 Content Management System
Responsibilities:
- Organize learning content into CMT levels, chapters, and subtopics
- Attach rich text notes and media assets
- Store PDFs for structured reading material
- Maintain versionable content records

Implementation notes:
- Each chapter belongs to a CMT level such as Level 1, Level 2, or Level 3.
- Subtopics belong to a single chapter and therefore inherit its level.
- Notes belong to a subtopic and can include embedded images.
- PDFs are stored as media assets and linked to the relevant chapter or subtopic.

### 4.4 Quiz Engine
Responsibilities:
- Generate quizzes from levels, chapters, subtopics, or mixed selections
- Randomize questions efficiently
- Support full-length tests across all content
- Store attempts, answers, and results
- Show explanations after answering

Implementation notes:
- Store questions independently from quiz attempts.
- Use a normalized attempt model to capture each question answered by each user.
- Preserve the selected level in quiz generation so level-specific pools remain isolated.
- Randomize question selection at query time, not by duplicating questions into quiz tables.

### 4.5 User Dashboard
Responsibilities:
- Show learning progress
- Show quiz history and performance
- Resume study from chapters and subtopics
- Surface premium-access state when enabled

### 4.6 Media Upload System
Responsibilities:
- Upload images for notes and questions
- Upload PDFs for study material
- Persist Cloudinary URLs and metadata in the database

Implementation notes:
- Keep upload credentials server-side.
- Store only secure URLs and public IDs in the database.
- Validate file type, size, and usage context before accepting uploads.
- Use signed upload metadata endpoints so admin clients upload directly to Cloudinary without exposing secrets.

## 5. Proposed Folder Structure

```text
src/
  app/
    (auth)/
      sign-in/
      sign-up/
      reset-password/
    (dashboard)/
      user/
      admin/
    api/
      auth/
      chapters/
      subtopics/
      notes/
      questions/
      quizzes/
      attempts/
      uploads/
      admin/
  components/
    ui/
    shared/
    admin/
    learning/
    quiz/
  features/
    auth/
    chapters/
    subtopics/
    notes/
    questions/
    quizzes/
    attempts/
    uploads/
  lib/
    auth/
    db/
    cloudinary/
    captcha/
    validators/
    utils/
  server/
    services/
    repositories/
    policies/
    validators/
    dto/
  prisma/
    schema.prisma
    migrations/
  types/
  styles/
  config/
  docs/
```

### Structure Rationale
- `app/` holds routes and route groups only.
- `features/` isolates feature-specific client and server helpers.
- `server/` contains business logic and reusable backend services.
- `lib/` contains low-level integration wrappers and shared utilities.
- `components/` keeps reusable UI components separated from feature logic.

## 6. API and Data Flow

### Read Flow
1. User opens a chapter or quiz page.
2. The Next.js server component requests data through service functions.
3. Services query PostgreSQL through Prisma.
4. Data is shaped into view models for the UI.

### Write Flow
1. Admin submits a form or quiz builder action.
2. Client validates basic shape and sends request to an API route.
3. API route verifies session, role, and input schema.
4. Service layer performs business rules and writes through Prisma.
5. Response returns the created or updated record.

### Media Flow
1. Admin client requests a signed upload payload from `/api/admin/uploads/signature`.
2. File is uploaded directly to Cloudinary using the signed fields.
3. Upload response returns a secure URL and public ID.
4. Admin client posts asset metadata to `/api/admin/uploads/record`.
5. API stores metadata in the media table and editors embed the secure URL.

### Quiz Flow
1. User selects scope: level, subtopic, chapter, custom mix, or full test.
2. Backend resolves the eligible question pool for the chosen CMT level.
3. Backend randomizes and limits the set based on rules.
4. Attempt record is created.
5. Each answer is stored with correctness and explanation visibility.
6. Final score is computed and persisted.

## 7. Scalability Considerations
- Index all foreign keys and quiz filter columns.
- Avoid storing repeated quiz snapshots unless needed for attempt audit.
- Keep notes and question content separate to support editorial updates.
- Use pagination for chapter lists, question lists, and attempt history.
- Consider caching stable content reads later if traffic grows.

## 8. Security Considerations
- Protect admin routes with role checks.
- Validate all inputs with a schema validator at the API boundary.
- Rate-limit login, password reset, and upload routes.
- Store only minimum necessary profile data.
- Keep Cloudinary and Supabase secrets in environment variables.

Phase note:
- reCAPTCHA integration is intentionally deferred to the next phase.
- Current implementation includes session-based authorization and route-level rate limiting on auth and write-heavy paths.

## 9. Deployment Notes
- Deploy the app on a platform compatible with Next.js App Router.
- Use Supabase for managed PostgreSQL and authentication.
- Use Cloudflare in front of the app for network protection and edge security.
- Keep environment variables separated by deployment target.
- Run Prisma migrations as part of the deployment pipeline.
