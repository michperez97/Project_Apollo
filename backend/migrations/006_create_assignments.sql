-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  due_date TIMESTAMP NOT NULL,
  points_possible INTEGER NOT NULL CHECK (points_possible > 0),
  allow_file_upload BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignments_module_id ON assignments(module_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
