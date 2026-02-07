CREATE TABLE IF NOT EXISTS user_notification_reads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key VARCHAR(255) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user_id
  ON user_notification_reads(user_id);

