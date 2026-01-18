import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, toPublicUser } from '../models/userModel';
import { CreateUserInput, SafeUser } from '../types/user';
import { AuthPayload, AuthResponse } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (payload: AuthPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const registerUser = async (data: CreateUserInput): Promise<AuthResponse> => {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new Error('Email already in use');
  }

  const password_hash = await bcrypt.hash(data.password, 10);
  const safeUser = await createUser({ ...data, password_hash });
  const token = generateToken({ sub: safeUser.id, email: safeUser.email, role: safeUser.role });

  return { user: safeUser, token };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  const safeUser: SafeUser = toPublicUser(user);
  const token = generateToken({ sub: safeUser.id, email: safeUser.email, role: safeUser.role });

  return { user: safeUser, token };
};

export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
};


