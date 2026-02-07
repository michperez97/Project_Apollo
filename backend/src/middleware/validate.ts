import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export const validate =
  (schema: ZodType, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((e: ZodError['issues'][number]) => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req[source] = result.data;
    return next();
  };
