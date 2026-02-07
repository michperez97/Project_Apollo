-- Add SCORM lesson support + runtime tracking

DO $$
DECLARE
  lesson_type_constraint TEXT;
BEGIN
  SELECT conname
  INTO lesson_type_constraint
  FROM pg_constraint
  WHERE conrelid = 'course_lessons'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%lesson_type%';

  IF lesson_type_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE course_lessons DROP CONSTRAINT %I',
      lesson_type_constraint
    );
  END IF;
END $$;

ALTER TABLE course_lessons
  ADD CONSTRAINT course_lessons_lesson_type_check
  CHECK (lesson_type IN ('video', 'text', 'quiz', 'scorm'));

CREATE TABLE IF NOT EXISTS scorm_packages (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL UNIQUE REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  package_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  launch_path TEXT NOT NULL,
  scorm_version VARCHAR(20) NOT NULL DEFAULT '1.2',
  manifest_identifier VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scorm_packages_course_id ON scorm_packages(course_id);
CREATE INDEX IF NOT EXISTS idx_scorm_packages_lesson_id ON scorm_packages(lesson_id);

CREATE TABLE IF NOT EXISTS scorm_attempts (
  id SERIAL PRIMARY KEY,
  scorm_package_id INTEGER NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  launch_token VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'passed', 'failed')),
  completion_status VARCHAR(20),
  success_status VARCHAR(20),
  score_raw NUMERIC(7, 2),
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  lesson_location TEXT,
  suspend_data TEXT,
  runtime_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_scorm_attempts_student_id ON scorm_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_scorm_attempts_lesson_id ON scorm_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scorm_attempts_package_id ON scorm_attempts(scorm_package_id);
CREATE INDEX IF NOT EXISTS idx_scorm_attempts_launch_token ON scorm_attempts(launch_token);
