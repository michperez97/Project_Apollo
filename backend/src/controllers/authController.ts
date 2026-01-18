import { Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { AuthenticatedRequest } from '../types/auth';
import { findUserById, toPublicUser } from '../models/userModel';

export const register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await registerUser({ email, password, first_name, last_name, role });
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
    const { email, password } = req.body;
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

