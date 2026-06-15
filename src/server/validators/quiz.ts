import { z } from 'zod';

export const quizModeSchema = z.enum(['SUBTOPIC', 'CHAPTER', 'CUSTOM', 'FULL_TEST']);
export const cmtLevelSchema = z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']);

export const quizSelectionSchema = z.object({
  mode: quizModeSchema,
  level: cmtLevelSchema.optional(),
  selectedChapterIds: z.array(z.string().min(1)).default([]),
  selectedSubtopicIds: z.array(z.string().min(1)).default([]),
  questionCount: z.number().int().positive().max(200).default(10),
  randomizeOrder: z.boolean().default(true),
  // Set server-side for FULL_TEST (official CMT exam timing); stored in the
  // attempt's selectionJson and read by the client to run the countdown.
  timeLimitMinutes: z.number().int().positive().max(600).optional(),
});

export const quizAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  timeSpentSeconds: z.number().int().nonnegative().optional(),
});

export type QuizSelectionInput = z.infer<typeof quizSelectionSchema>;
export type QuizAnswerInput = z.infer<typeof quizAnswerSchema>;
