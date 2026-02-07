import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { generateUploadSignature } from '../services/uploadService';

export const getUploadSignature = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const folder = req.query.folder ? String(req.query.folder) : undefined;
    const data = generateUploadSignature(folder);
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Cloudinary is not configured on the server' ||
        error.message === 'Cloudinary credentials are still set to placeholder values'
      ) {
        return res.status(503).json({ error: error.message });
      }

      if (error.message === 'Invalid upload folder') {
        return res.status(400).json({ error: error.message });
      }
    }
    return next(error);
  }
};
