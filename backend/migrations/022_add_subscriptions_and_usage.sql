-- Hybrid monetization support: user subscriptions + subscriber usage tracking.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (
    subscription_status IN (
      'inactive',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'trialing',
      'unpaid'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

CREATE TABLE IF NOT EXISTS course_subscription_usage (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  first_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_subscription_usage_course_id
  ON course_subscription_usage(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subscription_usage_student_id
  ON course_subscription_usage(student_id);

