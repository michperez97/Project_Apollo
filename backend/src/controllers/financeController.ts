import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  getStudentBalance,
  listTransactionsByStudent,
  listAllTransactions,
  getFinancialSummary,
  listAllStudentBalances
} from '../services/financeService';

export const getBalanceHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const studentIdParam = req.params.studentId;
    let studentId: number;

    if (studentIdParam) {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return res.status(403).json({ error: 'Only admins/teachers can view other student balances' });
      }
      studentId = Number(studentIdParam);
    } else {
      if (user.role !== 'student') {
        return res.status(400).json({ error: 'Provide studentId for non-student users' });
      }
      studentId = user.sub;
    }

    if (Number.isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const balance = await getStudentBalance(studentId);
    return res.json({ balance });
  } catch (error) {
    return next(error);
  }
};

export const listTransactionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const studentIdQuery = req.query.studentId ? Number(req.query.studentId) : undefined;

    if (studentIdQuery !== undefined) {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return res.status(403).json({ error: 'Only admins/teachers can view other student transactions' });
      }
      const transactions = await listTransactionsByStudent(studentIdQuery);
      return res.json({ transactions });
    }

    if (user.role === 'student') {
      const transactions = await listTransactionsByStudent(user.sub);
      return res.json({ transactions });
    }

    const transactions = await listAllTransactions();
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
};

export const getFinancialSummaryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const summary = await getFinancialSummary();
    return res.json({ summary });
  } catch (error) {
    return next(error);
  }
};

export const listStudentBalancesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const students = await listAllStudentBalances();
    return res.json({ students });
  } catch (error) {
    return next(error);
  }
};
