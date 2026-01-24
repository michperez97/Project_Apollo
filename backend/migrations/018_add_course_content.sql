-- Create course content and progress tables for marketplace

-- Course sections table
CREATE TABLE IF NOT EXISTS course_sections (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_position ON course_sections(course_id, position);

-- Course lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  lesson_type VARCHAR(20) NOT NULL CHECK (lesson_type IN ('video', 'text', 'quiz')),
  position INTEGER NOT NULL DEFAULT 0,
  video_url VARCHAR(500),
  content TEXT,
  duration_seconds INTEGER,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section_id ON course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_position ON course_lessons(section_id, position);

-- Student progress table
CREATE TABLE IF NOT EXISTS student_progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  last_position_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id ON student_progress(lesson_id);
