import pool from '../config/database';

export const listReadNotificationKeys = async (
  userId: number,
  keys: string[]
): Promise<Set<string>> => {
  if (!keys.length) {
    return new Set<string>();
  }

  const result = await pool.query<{ notification_key: string }>(
    `SELECT notification_key
     FROM user_notification_reads
     WHERE user_id = $1
       AND notification_key = ANY($2::text[])`,
    [userId, keys]
  );

  return new Set(result.rows.map((row) => row.notification_key));
};

export const markNotificationsRead = async (userId: number, keys: string[]): Promise<number> => {
  const uniqueKeys = Array.from(new Set(keys.filter((key) => key.trim().length > 0)));
  if (!uniqueKeys.length) {
    return 0;
  }

  const result = await pool.query(
    `INSERT INTO user_notification_reads (user_id, notification_key, read_at)
     SELECT $1, unnest($2::text[]), CURRENT_TIMESTAMP
     ON CONFLICT (user_id, notification_key)
     DO UPDATE SET read_at = EXCLUDED.read_at`,
    [userId, uniqueKeys]
  );

  return result.rowCount ?? uniqueKeys.length;
};

