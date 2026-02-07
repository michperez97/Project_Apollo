import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { listInstructorActivityFeed } from '../services/instructorActivityService';

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
};

export const getInstructorActivityFeedHandler = async (
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

    if (req.query.instructorId !== undefined) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can query other instructor activity feeds' });
      }

      const parsedInstructorId = parsePositiveInt(req.query.instructorId);
      if (!parsedInstructorId) {
        return res.status(400).json({ error: 'Invalid instructorId' });
      }
      instructorId = parsedInstructorId;
    }

    const limit = req.query.limit !== undefined ? parsePositiveInt(req.query.limit) ?? undefined : undefined;
    const activity = await listInstructorActivityFeed(instructorId, limit);
    return res.json({ activity });
  } catch (error) {
    return next(error);
  }
};
