import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().trim().min(1, 'Description is required'),
  category: z.string().trim().min(1, 'Category is required').max(100),
  price: z.number().min(0, 'Price must be non-negative'),
  thumbnail_url: z.string().url().optional().nullable(),
  instructor_id: z.number().int().positive().optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional()
});

export const updateCourseSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  thumbnail_url: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional()
});

export const courseIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid course id').transform(Number)
});
