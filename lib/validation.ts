import { z } from 'zod';

export const searchSchema = z.object({
  keyword: z.string()
    .min(2, 'Keyword must be at least 2 characters')
    .max(50, 'Keyword too long')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Invalid characters in keyword')
});