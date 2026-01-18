-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credit_hours INTEGER NOT NULL CHECK (credit_hours > 0),
  price_per_credit DECIMAL(10, 2) NOT NULL CHECK (price_per_credit >= 0),
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_semester_year ON courses(semester, year);
CREATE INDEX idx_courses_code ON courses(code);
