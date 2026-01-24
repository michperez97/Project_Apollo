-- Add course moderation support

-- Add published_at timestamp to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Create course_reviews table for moderation audit trail
CREATE TABLE IF NOT EXISTS course_reviews (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for course_reviews
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_admin_id ON course_reviews(admin_id);
