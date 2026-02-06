-- Drop legacy LMS columns from courses table.
-- The marketplace pivot (016) added title, category, price, instructor_id.
-- This migration removes the old LMS-era columns that are no longer used.

-- 1. Backfill title from name where missing, then make it NOT NULL.
UPDATE courses SET title = COALESCE(title, name) WHERE title IS NULL;
ALTER TABLE courses ALTER COLUMN title SET NOT NULL;

-- 2. Add published_at if it doesn't already exist (017 may have added it).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- 3. Drop legacy indexes.
DROP INDEX IF EXISTS idx_courses_teacher_id;
DROP INDEX IF EXISTS idx_courses_semester_year;
DROP INDEX IF EXISTS idx_courses_code;

-- 4. Drop the UNIQUE constraint on code.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_code_key;

-- 5. Drop legacy columns.
ALTER TABLE courses DROP COLUMN IF EXISTS code;
ALTER TABLE courses DROP COLUMN IF EXISTS name;
ALTER TABLE courses DROP COLUMN IF EXISTS credit_hours;
ALTER TABLE courses DROP COLUMN IF EXISTS price_per_credit;
ALTER TABLE courses DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE courses DROP COLUMN IF EXISTS semester;
ALTER TABLE courses DROP COLUMN IF EXISTS year;
