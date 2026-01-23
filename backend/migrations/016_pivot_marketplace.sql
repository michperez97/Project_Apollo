-- Pivot roles and course fields toward the marketplace schema.

-- Update user roles: teacher -> instructor.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'instructor' WHERE role = 'teacher';
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'instructor', 'student'));

-- Extend courses table with marketplace fields.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill new fields from existing LMS columns when possible.
UPDATE courses SET title = COALESCE(title, name);
UPDATE courses SET price = COALESCE(price, credit_hours * price_per_credit);
UPDATE courses SET instructor_id = COALESCE(instructor_id, teacher_id);

-- Constrain status values and add indexes for catalog queries.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses
  ADD CONSTRAINT courses_status_check CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
