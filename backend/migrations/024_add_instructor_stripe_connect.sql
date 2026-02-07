ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at TIMESTAMP NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_connect_account_id
  ON users(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_onboarded_at
  ON users(stripe_connect_onboarded_at);
