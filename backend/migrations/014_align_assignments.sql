-- Align assignments schema to match current code expectations
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill from legacy columns where present
UPDATE assignments
SET description = COALESCE(description, instructions),
    due_at = COALESCE(due_at, due_date),
    points = COALESCE(points, points_possible)
WHERE TRUE;

-- Drop legacy columns if they exist
ALTER TABLE assignments
  DROP COLUMN IF EXISTS instructions,
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS points_possible,
  DROP COLUMN IF EXISTS allow_file_upload;

-- Ensure NOT NULL constraints align with code (title, course_id mandatory; due_at optional)
ALTER TABLE assignments
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN course_id SET NOT NULL;

