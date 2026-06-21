import { z } from 'zod';

export const cmtLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']);

export const chapterInputSchema = z.object({
  level: cmtLevelSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
  isPublished: z.boolean().default(false),
  isTrialFree: z.boolean().default(false),
});

export const subtopicInputSchema = z.object({
  chapterId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
  isPublished: z.boolean().default(false),
});

export type ChapterInput = z.infer<typeof chapterInputSchema>;
export type SubtopicInput = z.infer<typeof subtopicInputSchema>;
