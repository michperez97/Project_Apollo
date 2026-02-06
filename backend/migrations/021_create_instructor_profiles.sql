CREATE TABLE IF NOT EXISTS instructor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  headline VARCHAR(200),
  bio TEXT,
  specializations TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_instructor_profiles_user_id ON instructor_profiles(user_id);
