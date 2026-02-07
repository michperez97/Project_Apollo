import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { listNotificationsForUser } from '../services/notificationFeedService';
import { markNotificationsRead } from '../models/notificationReadModel';

const MAX_NOTIFICATION_IDS_PER_REQUEST = 100;
const MAX_NOTIFICATION_ID_LENGTH = 255;

const parseNotificationIds = (
  value: unknown
): { ids: string[]; error: string | null } => {
  if (!Array.isArray(value)) {
    return { ids: [], error: 'notificationIds must be an array' };
  }

  if (value.length > MAX_NOTIFICATION_IDS_PER_REQUEST) {
    return {
      ids: [],
      error: `notificationIds cannot contain more than ${MAX_NOTIFICATION_IDS_PER_REQUEST} entries`
    };
  }

  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return { ids: [], error: 'notificationIds entries must be strings' };
    }

    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.length > MAX_NOTIFICATION_ID_LENGTH) {
      return {
        ids: [],
        error: `notificationIds entries must be ${MAX_NOTIFICATION_ID_LENGTH} characters or fewer`
      };
    }

    normalized.push(trimmed);
  }

  return { ids: Array.from(new Set(normalized)), error: null };
};

export const listNotificationsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const notifications = await listNotificationsForUser(req.user, rawLimit);
    return res.json({ notifications });
  } catch (error) {
    return next(error);
  }
};

export const markNotificationsReadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsed = parseNotificationIds(req.body.notificationIds);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const updated = await markNotificationsRead(req.user.sub, parsed.ids);
    return res.json({ success: true, updated });
  } catch (error) {
    return next(error);
  }
};
