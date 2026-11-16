import { z } from 'zod';

export const noteQuerySchema = z.object({
  search: z
    .string()
    .max(100, 'Search query must not exceed 100 characters')
    .optional(),
  page: z
    .coerce
    .number()
    .int('Page must be an integer')
    .positive('Page must be a positive integer')
    .default(1)
    .optional(),
  limit: z
    .coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20)
    .optional(),
  tags: z
    .union([
      z.string().transform((val) => val.split(',').map((t) => t.trim()).filter(Boolean)),
      z.array(z.string())
    ])
    .optional(),
  archived: z
    .coerce
    .boolean()
    .optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title'], {
      errorMap: () => ({ message: 'sortBy must be one of: createdAt, updatedAt, title' })
    })
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'sortOrder must be either asc or desc' })
    })
    .optional(),
});

export const noteIdParamSchema = z.object({
  id: z
    .string()
    .uuid('Note ID must be a valid UUID'),
});

export type NoteQueryParams = z.infer<typeof noteQuerySchema>;
export type NoteIdParams = z.infer<typeof noteIdParamSchema>;