-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  points_earned DECIMAL(10, 2) NOT NULL CHECK (points_earned >= 0),
  feedback TEXT,
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_grades_submission_id ON grades(submission_id);
CREATE INDEX idx_grades_graded_by ON grades(graded_by);
