import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { generateUploadSignature } from '../services/uploadService';

export const getUploadSignature = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const folder = req.query.folder ? String(req.query.folder) : undefined;
    const data = generateUploadSignature(folder);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};


