import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { handleAssistantChat } from '../services/assistantService';

export const assistantChatHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'message is too long' });
    }

    const result = await handleAssistantChat(message);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};
