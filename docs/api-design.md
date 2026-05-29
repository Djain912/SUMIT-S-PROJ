# API Design

## 1. API Principles
- Keep route handlers thin and delegate logic to services.
- Validate every request body and query string.
- Return consistent JSON envelopes.
- Separate admin routes from user routes.
- Keep read endpoints cache-friendly and write endpoints strict.

## 2. Response Format
Recommended response shape:

```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable message"
}
```

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

## 3. Route Groups

### 3.1 Authentication
- `POST /api/auth/captcha-verify`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Note: primary sign-in and sign-up flows are handled by Supabase Auth; the app API focuses on application-specific session checks and secure post-login provisioning.

### 3.2 User Profile
- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/progress`
- `GET /api/me/attempts`
- `GET /api/me/attempts/[id]`

### 3.3 Chapters
- `GET /api/chapters`
- `POST /api/admin/chapters`
- `PATCH /api/admin/chapters/[id]`
- `DELETE /api/admin/chapters/[id]`

Behavior:
- Chapter listing should support filtering by CMT level.
- Admin create and update payloads must include the target level.

### 3.4 Subtopics
- `GET /api/chapters/[chapterId]/subtopics`
- `POST /api/admin/subtopics`
- `PATCH /api/admin/subtopics/[id]`
- `DELETE /api/admin/subtopics/[id]`

### 3.5 Notes
- `GET /api/subtopics/[subtopicId]/notes`
- `GET /api/notes/[id]`
- `POST /api/admin/notes`
- `PATCH /api/admin/notes/[id]`
- `DELETE /api/admin/notes/[id]`

### 3.6 Questions
- `GET /api/admin/questions`
- `GET /api/questions/[id]`
- `POST /api/admin/questions`
- `PATCH /api/admin/questions/[id]`
- `DELETE /api/admin/questions/[id]`

### 3.7 Quiz Generation
- `POST /api/quizzes/preview`
- `POST /api/quizzes/start`
- `POST /api/quizzes/[attemptId]/answer`
- `POST /api/quizzes/[attemptId]/complete`
- `GET /api/quizzes/[attemptId]/review`

Behavior:
- Preview and start endpoints should accept level-aware selections.
- A chapter selection must resolve only against chapters in the chosen level.
- Mixed selections should deduplicate overlapping chapter and subtopic choices.

### 3.8 Uploads
- `POST /api/admin/uploads/signature`
- `POST /api/admin/uploads/record`
- `DELETE /api/admin/uploads/[id]`

Behavior:
- Signature endpoint returns timestamped signed fields for Cloudinary direct uploads.
- Record endpoint persists uploaded asset metadata to PostgreSQL after a successful Cloudinary upload.
- Both endpoints require admin session and are rate-limited.

## 4. Endpoint Behavior

### Chapters and Subtopics
- Admin endpoints require admin role.
- Public list endpoints return only published content.
- Sorting should respect `orderIndex`.
- Chapter create and update endpoints should validate the selected CMT level.
- Subtopic management should verify the parent chapter belongs to the intended level.

### Notes
- Notes are returned as structured rich text for editor and renderer compatibility.
- PDF links are returned separately from note content.
- Media assets should be resolved with secure metadata.

### Questions
- Question list endpoints should support filtering by chapter, subtopic, and publication status.
- Admin question create and update endpoints must accept nested options.
- The API should validate that at least one correct option exists.

### Quiz Start
Input example:
- mode
- level optional
- selectedChapterIds
- selectedSubtopicIds
- questionCount
- randomizeOrder

Behavior:
- Resolve eligible questions within the selected level when provided.
- Apply deduplication when selections overlap.
- Randomize the final set.
- Create the attempt row.
- Return a sanitized question payload without exposing the correct answer before submission.

### Answer Submission
Input example:
- questionId
- selectedOptionId
- answerTimeSeconds optional

Behavior:
- Validate attempt ownership.
- Compare answer to the correct option.
- Persist attempt item.
- Return correctness and explanation.

### Completion
Behavior:
- Aggregate attempt items.
- Calculate score.
- Mark attempt complete.
- Return final summary and review metadata.

## 5. Service Layer Map
Recommended service modules:
- `auth.service`
- `user.service`
- `chapter.service`
- `subtopic.service`
- `note.service`
- `question.service`
- `quiz.service`
- `attempt.service`
- `upload.service`
- `captcha.service`

## 6. Validation and Safety
- Validate UUIDs and numeric IDs at the boundary.
- Sanitize rich text before render if raw HTML is used anywhere.
- Reject unsupported file types and oversized uploads.
- Rate-limit public auth, quiz-start, and upload endpoints.
- Log admin mutations for traceability.

Current phase status:
- Session-based authorization is enforced on admin and quiz routes.
- Rate limiting is active on auth session/logout, quiz write routes, and admin mutation routes.
- reCAPTCHA is deferred to the next phase.

## 7. Authorization Rules
- Public users may view only published learning content.
- Authenticated users may take quizzes and view their own history.
- Admin users may manage all content.
- Premium access flags can gate chapter or quiz scope later without changing route structure.

## 8. Future API Extensions
- `GET /api/search`
- `GET /api/analytics/admin`
- `POST /api/bookmarks`
- `DELETE /api/bookmarks/[id]`
- `GET /api/recommendations`

## 9. Implementation Note
The API should use a consistent input schema layer and a shared error mapper so frontend components can rely on predictable failure handling across all features.
