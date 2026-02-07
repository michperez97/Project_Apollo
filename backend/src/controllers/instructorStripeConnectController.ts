import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  createInstructorConnectDashboardLink,
  createInstructorConnectOnboardingLink,
  getInstructorStripeConnectStatus,
  StripeConnectError
} from '../services/stripeConnectService';

const parsePositiveInt = (value: unknown): number | null => {
  if (Array.isArray(value)) {
    return null;
  }

  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveTargetInstructorId = (req: AuthenticatedRequest): number => {
  if (!req.user) {
    throw new StripeConnectError(401, 'Authentication required');
  }

  const requestedInstructorId = req.query.instructorId;
  if (requestedInstructorId === undefined) {
    return req.user.sub;
  }

  if (req.user.role !== 'admin') {
    throw new StripeConnectError(403, 'Only admins can query other instructors');
  }

  const parsed = parsePositiveInt(requestedInstructorId);
  if (!parsed) {
    throw new StripeConnectError(400, 'Invalid instructorId');
  }

  return parsed;
};

const handleStripeConnectControllerError = (
  res: Response,
  next: NextFunction,
  error: unknown
) => {
  if (error instanceof StripeConnectError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  return next(error);
};

export const getInstructorStripeConnectStatusHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const instructorId = resolveTargetInstructorId(req);
    const status = await getInstructorStripeConnectStatus(instructorId);
    return res.json({ status });
  } catch (error) {
    return handleStripeConnectControllerError(res, next, error);
  }
};

export const createInstructorConnectOnboardingLinkHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const instructorId = resolveTargetInstructorId(req);
    const result = await createInstructorConnectOnboardingLink(instructorId);
    return res.status(201).json({
      onboarding: {
        url: result.url,
        account_id: result.accountId
      }
    });
  } catch (error) {
    return handleStripeConnectControllerError(res, next, error);
  }
};

export const createInstructorConnectDashboardLinkHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const instructorId = resolveTargetInstructorId(req);
    const url = await createInstructorConnectDashboardLink(instructorId);
    return res.status(201).json({
      dashboard: {
        url
      }
    });
  } catch (error) {
    return handleStripeConnectControllerError(res, next, error);
  }
};
