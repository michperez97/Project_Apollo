-- Fix role constraint: rename 'teacher' to 'instructor'
-- Update any existing 'teacher' rows first
UPDATE users SET role = 'instructor' WHERE role = 'teacher';

-- Drop the old constraint and add the corrected one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'instructor', 'student'));
