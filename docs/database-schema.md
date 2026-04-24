# Database Schema Design

## 1. Design Goals
- Normalize content and quiz data to avoid redundancy.
- Keep relationships explicit and query-friendly.
- Support future premium gating and analytics without schema rewrites.
- Preserve quiz history even when source content changes.

## 2. Core Entities

### 2.1 User
Represents an authenticated learner or admin.

Recommended fields:
- id
- supabaseUserId
- email
- fullName
- avatarUrl
- role
- isPremium
- createdAt
- updatedAt

Notes:
- Supabase Auth remains the source of truth for login credentials.
- The local user table stores application metadata and role.

### 2.2 Chapter
Top-level learning unit within a CMT level.

Recommended fields:
- id
- level
- title
- slug
- description
- orderIndex
- isPublished
- createdAt
- updatedAt

Notes:
- Level identifies whether the chapter belongs to CMT Level 1, Level 2, or Level 3.
- Chapters are unique per level, not globally, so Level 1 and Level 2 can reuse human-readable slugs safely.

### 2.3 Subtopic
Child unit within a chapter.

Recommended fields:
- id
- chapterId
- title
- slug
- description
- orderIndex
- isPublished
- createdAt
- updatedAt

Notes:
- Subtopics inherit the level from their parent chapter.
- Subtopic slugs are unique within a chapter.

### 2.4 Note
Rich text content attached to a subtopic.

Recommended fields:
- id
- subtopicId
- title
- contentJson
- contentHtml optional
- orderIndex
- isPublished
- createdById
- updatedById
- createdAt
- updatedAt

### 2.5 MediaAsset
Cloudinary-backed uploaded asset.

Recommended fields:
- id
- url
- publicId
- kind
- mimeType
- originalName
- sizeBytes
- uploadedById
- createdAt

Notes:
- Store only Cloudinary metadata needed for rendering, replacement, and deletion.

### 2.6 Question
Question bank item used across quizzes.

Recommended fields:
- id
- level nullable
- chapterId nullable
- subtopicId nullable
- promptJson
- explanationJson nullable
- questionType
- difficulty optional
- isPublished
- createdById
- updatedById
- createdAt
- updatedAt

Notes:
- Level keeps question pools aligned with the chapter hierarchy and admin selection flow.
- Keep both `chapterId` and `subtopicId` nullable to support broader and narrower mapping.
- A question should usually belong to one subtopic, with chapter inferred through that relationship, but chapter-level assignment can remain available if needed for legacy or pooled items.

### 2.7 QuestionOption
Multiple choice options for a question.

Recommended fields:
- id
- questionId
- contentJson
- isCorrect
- orderIndex
- createdAt

### 2.8 QuizAttempt
One user’s quiz session.

Recommended fields:
- id
- userId
- mode
- level nullable
- selectionJson
- totalQuestions
- correctCount
- scorePercentage
- status
- startedAt
- completedAt nullable
- createdAt
- updatedAt

Notes:
- `scopePayloadJson` can store selected chapter IDs, subtopic IDs, or custom topic combinations.
- This keeps the attempt stable even if content relationships change later.

### 2.9 QuizAttemptItem
Per-question record within an attempt.

Recommended fields:
- id
- attemptId
- questionId
- questionOrder
- questionSnapshotJson
- selectedOptionId nullable
- selectedOptionSnapshotJson nullable
- isCorrect
- answeredAt
- timeSpentSeconds optional

Notes:
- This table is important for analytics and detailed review screens.
- It preserves the exact question order presented to the user.

## 3. Relationship Map
- User 1:N Note creator/updater references
- User 1:N Question creator/updater references
- User 1:N QuizAttempt
- CmtLevel 1:N Chapter
- Chapter 1:N Subtopic
- Subtopic 1:N Note
- Subtopic 1:N Question
- Question 1:N QuestionOption
- QuizAttempt 1:N QuizAttemptItem
- Question 1:N QuizAttemptItem
- QuestionOption 1:N QuizAttemptItem through selectedOptionId

## 4. Suggested Prisma Model Strategy

### Enums
Use enums for:
- UserRole: ADMIN, USER
- CmtLevel: LEVEL_1, LEVEL_2, LEVEL_3
- QuizMode: SUBTOPIC, CHAPTER, CUSTOM, FULL_TEST
- AttemptStatus: IN_PROGRESS, COMPLETED, ABANDONED
- MediaKind: IMAGE, PDF
- QuestionType: SINGLE_CHOICE, MULTI_CHOICE
- QuestionDifficulty: EASY, MEDIUM, HARD

### Indexing Strategy
Add indexes for:
- user email and supabaseUserId
- chapter level and slug
- subtopic chapterId and slug
- question level, subtopicId, and chapterId
- question isPublished
- quiz attempt userId and createdAt
- quiz attempt item attemptId and questionId

## 5. Query Patterns

### Content browsing
- Chapter lists grouped by CMT level
- Subtopics list by chapter
- Notes by subtopic
- Media by note or question context

### Quiz generation
- Questions by level
- Questions by subtopic IDs
- Questions by chapter IDs through subtopic expansion
- Questions by custom mixed selection
- Questions by publication state and optionally difficulty

### Reporting
- Attempt history by user
- Accuracy by chapter and subtopic
- Recent performance trends

## 6. Constraints and Integrity Rules
- Chapter slug should be unique within a level.
- Subtopic slug should be unique within a chapter.
- A question should have at least one option.
- A quiz attempt must contain at least one attempt item.
- Attempt summary fields should be derived from attempt items, not manually edited.
- Admin-created content should always track createdBy and updatedBy.

## 7. Prisma Schema Notes
The implementation should keep the schema normalized but practical for quiz workloads. A future enhancement can add:
- `UserProgress` for chapter completion tracking
- `Favorite` or `Bookmark` for saved notes
- `Tag` for cross-topic classification
- `QuizReviewSession` for repeated practice on weak topics

## 8. Example Entity Flow
- Admin creates a chapter for CMT Level 1.
- Admin creates subtopics under that chapter.
- Admin creates a rich-text note for a subtopic.
- Admin adds a question linked to the subtopic and uploads an image if needed.
- User starts a Level 1 chapter-based quiz.
- Backend expands the chapter into subtopics, resolves matching questions, and creates an attempt.
- Each answered question is stored as a QuizAttemptItem.
- Final score is computed from those items and persisted to the attempt.
