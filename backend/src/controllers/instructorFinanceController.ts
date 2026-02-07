import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  getInstructorEarnings,
  getInstructorCourseRevenue,
  getInstructorTransactions
} from '../services/instructorFinanceService';

export const getInstructorEarningsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let instructorId = user.sub;

    if (req.query.instructorId) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view other instructor earnings' });
      }
      instructorId = Number(req.query.instructorId);
      if (Number.isNaN(instructorId)) {
        return res.status(400).json({ error: 'Invalid instructor ID' });
      }
    }

    const earnings = await getInstructorEarnings(instructorId);
    return res.json({ earnings });
  } catch (error) {
    return next(error);
  }
};

export const getInstructorCourseRevenueHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let instructorId = user.sub;

    if (req.query.instructorId) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view other instructor course revenue' });
      }
      instructorId = Number(req.query.instructorId);
      if (Number.isNaN(instructorId)) {
        return res.status(400).json({ error: 'Invalid instructor ID' });
      }
    }

    const courses = await getInstructorCourseRevenue(instructorId);
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const getInstructorTransactionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let instructorId = user.sub;

    if (req.query.instructorId) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view other instructor transactions' });
      }
      instructorId = Number(req.query.instructorId);
      if (Number.isNaN(instructorId)) {
        return res.status(400).json({ error: 'Invalid instructor ID' });
      }
    }

    const transactions = await getInstructorTransactions(instructorId);
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
};
