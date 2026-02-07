# Step 2 - Target Data Model + Migration Path

Goal: define the target marketplace data model and a safe migration path from the legacy LMS schema.
Deliverable is documentation only; do not change runtime code or run migrations.

Execution Tasks
1) Create `PIVOT_DATA_MODEL.md` at the repo root (ASCII only).
2) Include sections:
   - Target entities and relationships (tables, key columns, enums)
   - Indexes and constraints (unique keys, FK cascade rules)
   - Migration plan (phased steps, additive first, legacy cleanup last)
   - Data backfill strategy (if we need to preserve legacy data)
   - Open questions / assumptions
3) Keep it concise but implementation-ready (engineer can write SQL from it).

Scope and Requirements (from SRS/SDS)
- Marketplace model: courses priced per course, public catalog, instructor-driven creation.
- Sections + lessons (video, text, quiz) replace modules/module_items.
- Admin moderation workflow (course status: draft, pending, approved, rejected).
- Per-course purchase via Stripe checkout -> enrollment creation on webhook.
- Student progress tracking per lesson, resume position.
- Transactions history with status (pending/completed/failed/refunded).

Existing References (for context)
- Legacy schema and fields: `backend/migrations/002_create_courses.sql`, `003_create_enrollments.sql`,
  `004_create_modules.sql`, `005_create_module_items.sql`, `006_create_assignments.sql`,
  `007_create_submissions.sql`, `008_create_grades.sql`, `009_create_announcements.sql`
- Marketplace pivot fields: `backend/migrations/016_pivot_marketplace.sql`
- Models: `backend/src/models/courseModel.ts`, `backend/src/models/enrollmentModel.ts`,
  `backend/src/models/transactionModel.ts`

Suggested Target Schema (draft)
- courses: id, instructor_id, title, description, category, price, thumbnail_url,
  status (draft|pending|approved|rejected), created_at, updated_at
- course_sections: id, course_id, title, position, created_at, updated_at
- course_lessons: id, course_id, section_id, title, lesson_type (video|text|quiz),
  position, video_url, content, duration_seconds, is_preview, created_at, updated_at
- lesson_resources (optional): id, lesson_id, title, url, kind (pdf|link|file)
- enrollments: id, student_id, course_id, purchased_at, price_paid, currency,
  status (active|refunded), UNIQUE(student_id, course_id)
- transactions: id, student_id, course_id, amount, currency, stripe_checkout_session_id,
  stripe_payment_intent_id, status (pending|completed|failed|refunded), created_at
- student_progress: id, student_id, lesson_id, status (in_progress|completed),
  last_position_seconds, completed_at, updated_at, UNIQUE(student_id, lesson_id)
- course_reviews (optional for moderation audit): id, course_id, admin_id, status,
  feedback, created_at

Migration Notes
- Add new tables first (sections, lessons, progress, purchases fields).
- Add new columns to enrollments/transactions if keeping tables; otherwise create new tables.
- Backfill mapping if preserving content:
  modules -> course_sections, module_items -> course_lessons (type mapping: text/link/file).
- Create a final cleanup migration to drop legacy tables/columns after new flows ship.

Constraints
- Doc-only edits for this step.
- No code changes or DB execution.
