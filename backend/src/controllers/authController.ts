import { Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { AuthenticatedRequest } from '../types/auth';
import { findUserById, toPublicUser } from '../models/userModel';
import { UserRole } from '../types/user';

const readRequiredString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseRole = (value: unknown): UserRole | null => {
  const raw = readRequiredString(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();
  return normalized === 'admin' || normalized === 'instructor' || normalized === 'student'
    ? normalized
    : null;
};

export const register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const email = readRequiredString(req.body.email);
    const password = readRequiredString(req.body.password);
    const firstName = readRequiredString(req.body.first_name);
    const lastName = readRequiredString(req.body.last_name);
    const role = parseRole(req.body.role);

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await registerUser({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    return next(error);
  }
};

export const login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const email = readRequiredString(req.body.email);
    const password = readRequiredString(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await loginUser(email, password);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid credentials')) {
      return res.status(401).json({ error: error.message });
    }
    return next(error);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await findUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
};
