import pool from '../config/database';
import { CreateUserInput, SafeUser, UserRecord } from '../types/user';

const toSafeUser = (record: UserRecord): SafeUser => ({
  id: record.id,
  email: record.email,
  first_name: record.first_name,
  last_name: record.last_name,
  role: record.role,
  created_at: record.created_at,
  updated_at: record.updated_at
});

export const findUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
};

export const findUserById = async (id: number): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const createUser = async (input: CreateUserInput & { password_hash: string }): Promise<SafeUser> => {
  const { email, password_hash, first_name, last_name, role } = input;
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [email.toLowerCase(), password_hash, first_name, last_name, role]
  );

  return toSafeUser(result.rows[0]);
};

export const toPublicUser = toSafeUser;

