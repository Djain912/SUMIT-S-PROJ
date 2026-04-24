import { z } from 'zod';

export const cmtLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']);

export const chapterSchema = z.object({
  level: cmtLevelSchema,
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
  isPublished: z.coerce.boolean().default(false),
});

export const subtopicSchema = z.object({
  chapterId: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
  isPublished: z.coerce.boolean().default(false),
});

export const noteSchema = z.object({
  subtopicId: z.string().min(1),
  title: z.string().min(1),
  contentJson: z.any().optional(),
  contentHtml: z.string().optional().nullable(),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
  isPublished: z.coerce.boolean().default(false),
});

export const questionOptionSchema = z.object({
  contentJson: z.any(),
  isCorrect: z.coerce.boolean().default(false),
  orderIndex: z.coerce.number().int().nonnegative().default(0),
});

export const questionSchema = z.object({
  level: cmtLevelSchema.optional().nullable(),
  chapterId: z.string().optional().nullable(),
  subtopicId: z.string().optional().nullable(),
  promptJson: z.any(),
  explanationJson: z.any().optional().nullable(),
  questionType: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE']).default('SINGLE_CHOICE'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().nullable(),
  isPublished: z.coerce.boolean().default(false),
  options: z.array(questionOptionSchema).min(1),
});

export type ChapterFormValues = z.infer<typeof chapterSchema>;
export type SubtopicFormValues = z.infer<typeof subtopicSchema>;
export type NoteFormValues = z.infer<typeof noteSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
