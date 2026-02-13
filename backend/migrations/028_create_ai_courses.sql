CREATE TABLE ai_courses (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'ready', 'failed')),
  content JSONB NOT NULL DEFAULT '{}',
  prompt TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_courses_student_id_idx ON ai_courses(student_id);
CREATE INDEX ai_courses_status_idx ON ai_courses(status);
