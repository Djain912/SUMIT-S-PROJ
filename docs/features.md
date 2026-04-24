# Feature Specification

## 1. Product Phases

### Phase 1: Core Learning Platform
- Authentication with Supabase Auth
- Admin content management
- Notes and PDF delivery
- Quiz engine
- User dashboard
- Security baseline

### Phase 2: Monetization and Growth
- Free vs premium access tiers
- Payment integration
- Access gating by chapter or quiz type
- Usage analytics and retention features

## 2. Admin Features

### 2.1 Chapter Management
- Create, edit, delete chapters
- Assign each chapter to CMT Level 1, Level 2, or Level 3
- Order chapters for curriculum flow
- Publish or unpublish chapters
- Add short descriptions for learners

### 2.2 Subtopic Management
- Create, edit, delete subtopics
- Attach each subtopic to a chapter
- Keep subtopics scoped to the chapter's level
- Set display order within the chapter
- Publish or unpublish subtopics independently

### 2.3 Notes Editor
- Rich text editing with TipTap
- Bold, headings, lists, quotes, code blocks where needed
- Image embedding from Cloudinary
- Save notes as structured content
- Preview before publishing

### 2.4 PDF Uploads
- Upload PDFs from the admin panel
- Attach PDFs to notes or subtopics
- Store Cloudinary URL and file metadata
- Allow replacement without losing references

### 2.5 Quiz Builder
- Create questions with multiple options
- Mark the correct answer
- Add detailed explanations
- Embed images in questions
- Reorder options
- Publish or unpublish questions

## 3. User Features

### 3.1 Authentication
- Google login
- Email and password login
- Password reset
- Protected dashboard access

### 3.2 Learning Experience
- Browse chapters and subtopics
- Open notes in a clean reading view
- Download or preview PDFs
- Track study progression later through user history

### 3.3 Quiz Modes
- Level-based quiz entry
- Subtopic-based quiz
- Chapter-based quiz
- Custom multi-subtopic quiz
- Full-length exam mode

### 3.4 Quiz Behavior
- Resolve questions within the selected CMT level when a level is chosen
- Random question selection from the allowed pool
- Immediate feedback after each answer
- Show explanation after answering
- Track score, accuracy, and attempts
- Preserve past attempts for review

### 3.5 Dashboard Experience
- Recent attempts
- Best scores by topic
- Continue learning shortcuts
- Premium status and access indicators

## 4. UX Requirements
- Minimal black, white, and gray visual language
- Clean, readable typography
- Mobile-first layout
- Fast navigation between chapters, notes, and quiz screens
- Use shadcn/ui for consistent interaction patterns

## 5. Security Features
- reCAPTCHA on sensitive public forms (next phase)
- Rate limiting on auth and quiz actions
- Server-side authorization for admin actions
- Input validation on every write endpoint
- Safe handling of uploaded assets

## 6. Content Rules
- Notes must support rich text and images.
- Questions must store at least one correct answer.
- PDFs must be linked to a learning context.
- Published content must be separated from draft content.

## 7. Operational Features
- Audit metadata for admin changes
- Stable content identifiers for linking and analytics
- Error states that are user-friendly but not verbose
- Logging on failed auth, upload, and quiz submission flows

## 8. Non-Functional Targets
- Fast initial page load
- Efficient quiz generation on large question pools
- Safe concurrent admin edits
- Predictable API contracts
- Clear separation of content and runtime state
