-- Merge grades into submissions per current code expectations

-- Add new columns to submissions if missing
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS content_url TEXT,
  ADD COLUMN IF NOT EXISTS content_text TEXT,
  ADD COLUMN IF NOT EXISTS grade NUMERIC,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Backfill from legacy columns (content/file_url/status + grades table)
UPDATE submissions s
SET content_text = COALESCE(s.content_text, s.content),
    content_url = COALESCE(s.content_url, s.file_url)
WHERE TRUE;

-- Backfill grade/feedback from grades table when present
UPDATE submissions s
SET grade = g.points_earned,
    feedback = g.feedback
FROM grades g
WHERE g.submission_id = s.id;

-- Drop legacy columns on submissions
ALTER TABLE submissions
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS status;

-- Drop grades table (no longer used)
DROP TABLE IF EXISTS grades;

-- Ensure uniqueness constraint remains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'submissions_unique'
      AND conrelid = 'submissions'::regclass
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_unique UNIQUE (assignment_id, student_id);
  END IF;
END $$;
