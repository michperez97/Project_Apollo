# PIVOT DATA MODEL - Marketplace Schema

Target data model and migration path for the LMS-to-marketplace pivot.
This document is implementation-ready; engineers can write SQL directly from it.

---

## 1. Target Entities and Relationships

### Entity Relationship Diagram (ASCII)

```
users (existing)
  |
  +--< courses (1:N instructor)
  |      |
  |      +--< course_sections (1:N)
  |      |      |
  |      |      +--< course_lessons (1:N)
  |      |             |
  |      |             +--< lesson_resources (1:N, optional)
  |      |
  |      +--< course_reviews (1:N, moderation audit)
  |
  +--< enrollments (M:N student-course via junction)
  |
  +--< transactions (1:N student)
  |
  +--< student_progress (M:N student-lesson via junction)
```

---

### Table: users (existing - no changes)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, CHECK (admin, instructor, student) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### Table: courses (modified)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| instructor_id | INTEGER | FK users(id) ON DELETE SET NULL | |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| category | VARCHAR(100) | | |
| price | DECIMAL(10,2) | NOT NULL DEFAULT 0, CHECK >= 0 | 0 = free |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'USD' | ISO 4217 |
| thumbnail_url | VARCHAR(500) | | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'draft' | Enum below |
| published_at | TIMESTAMP | | Set when approved |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Status Enum:** draft | pending | approved | rejected

**Legacy columns to DROP (cleanup migration):**
- code, name, credit_hours, price_per_credit, teacher_id, semester, year

---

### Table: course_sections (new)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| course_id | INTEGER | NOT NULL, FK courses(id) ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| position | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### Table: course_lessons (new)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| course_id | INTEGER | NOT NULL, FK courses(id) ON DELETE CASCADE | Denormalized for queries |
| section_id | INTEGER | NOT NULL, FK course_sections(id) ON DELETE CASCADE | |
| title | VARCHAR(255) | NOT NULL | |
| lesson_type | VARCHAR(20) | NOT NULL | Enum below |
| position | INTEGER | NOT NULL DEFAULT 0 | |
| video_url | VARCHAR(500) | | For video lessons |
| content | TEXT | | For text lessons / quiz JSON |
| duration_seconds | INTEGER | | Video duration |
| is_preview | BOOLEAN | DEFAULT false | Free preview flag |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Lesson Type Enum:** video | text | quiz

---

### Table: lesson_resources (new, optional)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| lesson_id | INTEGER | NOT NULL, FK course_lessons(id) ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| url | VARCHAR(500) | NOT NULL |
| kind | VARCHAR(20) | NOT NULL, CHECK (pdf, link, file) |
| position | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### Table: enrollments (modified)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| student_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE | |
| course_id | INTEGER | NOT NULL, FK courses(id) ON DELETE CASCADE | |
| transaction_id | INTEGER | FK transactions(id) ON DELETE SET NULL | Links to purchase |
| price_paid | DECIMAL(10,2) | NOT NULL | Price at time of purchase |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'USD' | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Enum below |
| purchased_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| refunded_at | TIMESTAMP | | |

**Status Enum:** pending | active | refunded
**Note:** Use `pending` only if an enrollment is created before checkout completes.

**Unique Constraint:** UNIQUE(student_id, course_id)

**Legacy columns to DROP (cleanup migration):**
- tuition_amount, payment_status, enrolled_at

---

### Table: transactions (modified)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| student_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE | |
| course_id | INTEGER | FK courses(id) ON DELETE SET NULL | Links to purchased course |
| type | VARCHAR(20) | NOT NULL DEFAULT 'payment' | Enum below |
| amount | DECIMAL(10,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'USD' | |
| stripe_checkout_session_id | VARCHAR(255) | | From Stripe Checkout |
| stripe_payment_intent_id | VARCHAR(255) | | From webhook |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | Enum below |
| description | TEXT | | Optional note |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Status Enum:** pending | completed | failed | refunded
**Type Enum:** payment | refund | adjustment

---

### Table: student_progress (new)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| student_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| lesson_id | INTEGER | NOT NULL, FK course_lessons(id) ON DELETE CASCADE |
| status | VARCHAR(20) | NOT NULL DEFAULT 'in_progress' |
| last_position_seconds | INTEGER | DEFAULT 0 |
| completed_at | TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Status Enum:** in_progress | completed

**Unique Constraint:** UNIQUE(student_id, lesson_id)

---

### Table: course_reviews (new, moderation audit)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| course_id | INTEGER | NOT NULL, FK courses(id) ON DELETE CASCADE |
| admin_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE |
| action | VARCHAR(20) | NOT NULL, CHECK (approved, rejected) |
| feedback | TEXT | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## 2. Indexes and Constraints

### Indexes

```sql
-- courses
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_status_published ON courses(status, published_at DESC);

-- course_sections
CREATE INDEX idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX idx_course_sections_position ON course_sections(course_id, position);

-- course_lessons
CREATE INDEX idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX idx_course_lessons_section_id ON course_lessons(section_id);
CREATE INDEX idx_course_lessons_position ON course_lessons(section_id, position);

-- lesson_resources
CREATE INDEX idx_lesson_resources_lesson_id ON lesson_resources(lesson_id);

-- enrollments
CREATE UNIQUE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- transactions
CREATE INDEX idx_transactions_student_id ON transactions(student_id);
CREATE INDEX idx_transactions_course_id ON transactions(course_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_stripe_checkout ON transactions(stripe_checkout_session_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- student_progress
CREATE UNIQUE INDEX idx_student_progress_student_lesson ON student_progress(student_id, lesson_id);
CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_lesson_id ON student_progress(lesson_id);

-- course_reviews
CREATE INDEX idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX idx_course_reviews_admin_id ON course_reviews(admin_id);
```

### Foreign Key Cascade Rules

| Table | FK Column | References | ON DELETE |
|-------|-----------|------------|-----------|
| courses | instructor_id | users(id) | SET NULL |
| course_sections | course_id | courses(id) | CASCADE |
| course_lessons | course_id | courses(id) | CASCADE |
| course_lessons | section_id | course_sections(id) | CASCADE |
| lesson_resources | lesson_id | course_lessons(id) | CASCADE |
| enrollments | student_id | users(id) | CASCADE |
| enrollments | course_id | courses(id) | CASCADE |
| enrollments | transaction_id | transactions(id) | SET NULL |
| transactions | student_id | users(id) | CASCADE |
| transactions | course_id | courses(id) | SET NULL |
| student_progress | student_id | users(id) | CASCADE |
| student_progress | lesson_id | course_lessons(id) | CASCADE |
| course_reviews | course_id | courses(id) | CASCADE |
| course_reviews | admin_id | users(id) | CASCADE |

---

## 3. Migration Plan

### Phase 1: Additive Schema (Non-Breaking)

**Migration 017_add_marketplace_tables.sql**
- CREATE TABLE course_sections
- CREATE TABLE course_lessons
- CREATE TABLE lesson_resources
- CREATE TABLE student_progress
- CREATE TABLE course_reviews
- ADD COLUMN courses.currency
- ADD COLUMN courses.published_at
- ADD COLUMN enrollments.transaction_id
- ADD COLUMN enrollments.price_paid
- ADD COLUMN enrollments.currency
- ADD COLUMN enrollments.status (new enum)
- ADD COLUMN enrollments.purchased_at
- ADD COLUMN enrollments.refunded_at
- ADD COLUMN transactions.course_id
- ADD COLUMN transactions.currency
- ADD COLUMN transactions.stripe_checkout_session_id
- ADD COLUMN transactions.stripe_payment_intent_id
- CREATE all new indexes

### Phase 2: Data Backfill (If Preserving Content)

**Migration 018_backfill_marketplace_data.sql**
- Backfill enrollments.price_paid from tuition_amount
- Backfill enrollments.purchased_at from enrolled_at
- Backfill enrollments.status = 'active' where payment_status = 'paid'
- Backfill courses.currency = 'USD'
- Backfill transactions.currency = 'USD'

### Phase 3: Legacy Cleanup (After New Flows Ship)

**Migration 019_drop_legacy_columns.sql**
- DROP COLUMN courses.code
- DROP COLUMN courses.name
- DROP COLUMN courses.credit_hours
- DROP COLUMN courses.price_per_credit
- DROP COLUMN courses.teacher_id
- DROP COLUMN courses.semester
- DROP COLUMN courses.year
- DROP COLUMN enrollments.tuition_amount
- DROP COLUMN enrollments.payment_status
- DROP COLUMN enrollments.enrolled_at
- DROP legacy indexes (idx_courses_code, idx_courses_semester_year, idx_courses_teacher_id)

**Migration 020_drop_legacy_tables.sql**
- DROP TABLE IF EXISTS grades
- DROP TABLE IF EXISTS submissions
- DROP TABLE IF EXISTS assignments
- DROP TABLE IF EXISTS announcements
- DROP TABLE IF EXISTS module_items
- DROP TABLE IF EXISTS modules

---

## 4. Data Backfill Strategy

### Option A: Fresh Start (Recommended for MVP)
- Do not migrate legacy LMS content (modules, assignments, etc.)
- Keep existing users and auth data
- Instructors create new courses in marketplace format
- Mark legacy enrollments as inactive or archived

### Option B: Content Migration (If Preserving Data)

**Mapping: modules -> course_sections**
```sql
-- Build a deterministic mapping table to avoid duplicate-title collisions
CREATE TEMP TABLE module_section_map (
  module_id INT PRIMARY KEY,
  section_id INT NOT NULL
);

WITH ranked_modules AS (
  SELECT m.*,
         ROW_NUMBER() OVER (PARTITION BY m.course_id ORDER BY m.position, m.id) AS rn
  FROM modules m
),
inserted AS (
  INSERT INTO course_sections (course_id, title, position, created_at, updated_at)
  SELECT course_id, title, position, created_at, updated_at
  FROM ranked_modules
  RETURNING id, course_id, position
),
ranked_sections AS (
  SELECT s.*,
         ROW_NUMBER() OVER (PARTITION BY s.course_id ORDER BY s.position, s.id) AS rn
  FROM inserted s
)
INSERT INTO module_section_map (module_id, section_id)
SELECT rm.id, rs.id
FROM ranked_modules rm
JOIN ranked_sections rs
  ON rs.course_id = rm.course_id
 AND rs.rn = rm.rn;
```

**Mapping: module_items -> course_lessons**
```sql
CREATE TEMP TABLE module_item_lesson_map (
  module_item_id INT PRIMARY KEY,
  lesson_id INT NOT NULL
);

WITH ranked_items AS (
  SELECT mi.*,
         ROW_NUMBER() OVER (PARTITION BY mi.module_id ORDER BY mi.position, mi.id) AS rn
  FROM module_items mi
),
inserted AS (
  INSERT INTO course_lessons (course_id, section_id, title, lesson_type, position,
                              video_url, content, created_at, updated_at)
  SELECT m.course_id,
         msm.section_id,
         ri.title,
         CASE WHEN ri.type = 'text' THEN 'text' ELSE 'text' END,
         ri.position,
         NULL,
         COALESCE(ri.content_text, ri.content_url),
         ri.created_at,
         ri.updated_at
  FROM ranked_items ri
  JOIN modules m ON ri.module_id = m.id
  JOIN module_section_map msm ON msm.module_id = m.id
  RETURNING id, section_id, position
),
ranked_lessons AS (
  SELECT l.*,
         ROW_NUMBER() OVER (PARTITION BY l.section_id ORDER BY l.position, l.id) AS rn
  FROM inserted l
)
INSERT INTO module_item_lesson_map (module_item_id, lesson_id)
SELECT ri.id, rl.id
FROM ranked_items ri
JOIN module_section_map msm ON msm.module_id = ri.module_id
JOIN ranked_lessons rl
  ON rl.section_id = msm.section_id
 AND rl.rn = ri.rn;

INSERT INTO lesson_resources (lesson_id, title, url, kind, position, created_at)
SELECT mlm.lesson_id,
       ri.title,
       ri.content_url,
       ri.type,
       1,
       ri.created_at
FROM module_items ri
JOIN module_item_lesson_map mlm ON mlm.module_item_id = ri.id
WHERE ri.type IN ('link', 'file') AND ri.content_url IS NOT NULL;
```

**Enrollment Backfill**
```sql
UPDATE enrollments
SET price_paid = tuition_amount,
    currency = 'USD',
    purchased_at = enrolled_at,
    status = CASE
      WHEN payment_status = 'paid' THEN 'active'
      WHEN payment_status IN ('pending', 'partial') THEN 'pending'
      ELSE 'pending'
    END;
```

---

## 5. Open Questions / Assumptions

### Assumptions Made
1. **Currency**: USD only for MVP; currency column added for future multi-currency
2. **Free courses**: price = 0 means free; no checkout required, direct enrollment
3. **Refunds**: Handled via Stripe dashboard; webhook updates transaction + enrollment status
4. **Quiz storage**: Quiz questions/answers stored as JSON in course_lessons.content
5. **Video hosting**: URLs point to Cloudinary or external CDN; no self-hosting
6. **Preview lessons**: is_preview flag allows unenrolled users to view specific lessons

### Open Questions
1. **Instructor payouts**: Need payout tracking table? Or rely on Stripe Connect reporting?
2. **Course versioning**: Should we track course version when student enrolls for content stability?
3. **Certificates**: Separate certificates table needed? Or generate on-demand from progress?
4. **Reviews/ratings**: Student course reviews (separate from admin moderation) planned?
5. **Coupons/discounts**: Need promo_codes table for discount codes?
6. **Bundle pricing**: Support for course bundles? Requires additional junction table.

### Deferred for Future
- Instructor analytics dashboard (views, enrollments, revenue)
- Student course ratings and reviews
- Course bundles and subscription pricing
- Multi-language course content
- Instructor verification/onboarding workflow

---

## Summary

| Entity | Action | Migration Phase |
|--------|--------|-----------------|
| users | No change | - |
| courses | Modify (add columns, drop legacy later) | 1, 3 |
| course_sections | New | 1 |
| course_lessons | New | 1 |
| lesson_resources | New | 1 |
| enrollments | Modify (add columns, drop legacy later) | 1, 3 |
| transactions | Modify (add columns, drop legacy later) | 1, 3 |
| student_progress | New | 1 |
| course_reviews | New | 1 |
| modules | Drop | 3 |
| module_items | Drop | 3 |
| assignments | Drop | 3 |
| submissions | Drop | 3 |
| grades | Drop | 3 |
| announcements | Drop | 3 |

---

*Generated for Project Apollo marketplace pivot - Data Model v1.0*
