import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid note ID format. Must be a valid UUID.' }),
});

export const createNoteSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(150, { message: 'Title cannot exceed 150 characters' }),
  content: z
    .string()
    .trim()
    .max(20000, { message: 'Content cannot exceed 20,000 characters' })
    .optional()
    .default(''),
  pinned: z.boolean().optional().default(false),
});

export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title cannot be empty' })
      .max(150, { message: 'Title cannot exceed 150 characters' })
      .optional(),
    content: z
      .string()
      .trim()
      .max(20000, { message: 'Content cannot exceed 20,000 characters' })
      .optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.content !== undefined || data.pinned !== undefined,
    {
      message: 'At least one field (title, content, or pinned) must be provided for update',
    }
  );
