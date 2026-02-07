import pool from '../config/database';
import { CreateUserInput, SafeUser, SubscriptionStatus, UserRecord } from '../types/user';

const toSafeUser = (record: UserRecord): SafeUser => ({
  id: record.id,
  email: record.email,
  first_name: record.first_name,
  last_name: record.last_name,
  role: record.role,
  subscription_status: record.subscription_status ?? 'inactive',
  current_period_end: record.current_period_end ?? null,
  stripe_customer_id: record.stripe_customer_id ?? null,
  created_at: record.created_at,
  updated_at: record.updated_at
});

export const findUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    'SELECT * FROM users WHERE email = LOWER($1)',
    [email.trim()]
  );
  return result.rows[0] ?? null;
};

export const findUserById = async (id: number): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const findUserByStripeCustomerId = async (customerId: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    'SELECT * FROM users WHERE stripe_customer_id = $1 LIMIT 1',
    [customerId]
  );
  return result.rows[0] ?? null;
};

export const createUser = async (input: CreateUserInput & { password_hash: string }): Promise<SafeUser> => {
  const { email, password_hash, first_name, last_name, role } = input;
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [email.trim().toLowerCase(), password_hash, first_name, last_name, role]
  );

  return toSafeUser(result.rows[0]);
};

export const updateUserSubscription = async (
  userId: number,
  data: {
    subscription_status: SubscriptionStatus;
    current_period_end: Date | null;
    stripe_customer_id?: string | null;
  }
): Promise<SafeUser | null> => {
  const result = await pool.query<UserRecord>(
    `UPDATE users
     SET subscription_status = $1,
         current_period_end = $2,
         stripe_customer_id = COALESCE($3, stripe_customer_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [
      data.subscription_status,
      data.current_period_end,
      data.stripe_customer_id ?? null,
      userId
    ]
  );

  return result.rows[0] ? toSafeUser(result.rows[0]) : null;
};

export const toPublicUser = toSafeUser;
