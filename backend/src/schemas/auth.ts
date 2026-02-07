import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email format').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  first_name: z.string().trim().min(1, 'First name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
  role: z.enum(['admin', 'instructor', 'student'])
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});
