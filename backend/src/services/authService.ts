import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { createUser, findUserByEmail, toPublicUser } from '../models/userModel';
import { CreateUserInput, SafeUser } from '../types/user';
import { AuthPayload, AuthResponse } from '../types/auth';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN ||
  '7d') as SignOptions['expiresIn'];

const generateToken = (payload: AuthPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);

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
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token');
  }

  return {
    sub: Number(decoded.sub),
    email: String(decoded.email),
    role: decoded.role as AuthPayload['role']
  };
};
