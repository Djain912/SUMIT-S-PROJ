import { prisma } from '@/lib/db/prisma';
import type { QuestionFormValues } from '@/server/validators/admin-content';

export async function listQuestions(filters?: { chapterId?: string; subtopicId?: string; level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' }, includeDeleted = false) {
  return prisma.question.findMany({
    where: {
      ...(filters?.chapterId ? { chapterId: filters.chapterId } : {}),
      ...(filters?.subtopicId ? { subtopicId: filters.subtopicId } : {}),
      ...(filters?.level ? { level: filters.level } : {}),
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    include: {
      options: {
        where: includeDeleted ? undefined : { isDeleted: false },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function createQuestion(input: QuestionFormValues, createdById?: string) {
  const { options, ...data } = input;

  return prisma.question.create({
    data: {
      level: data.level,
      chapterId: data.chapterId || null,
      subtopicId: data.subtopicId || null,
      promptJson: data.promptJson as object,
      explanationJson: data.explanationJson ? data.explanationJson as object : undefined,
      questionType: data.questionType,
      difficulty: data.difficulty,
      isPublished: data.isPublished,
      createdById,
      updatedById: createdById,
      options: {
        create: options.map((option) => ({
          contentJson: option.contentJson as object,
          isCorrect: option.isCorrect,
          orderIndex: option.orderIndex,
        })),
      },
    },
    include: { options: true },
  });
}

export async function updateQuestion(id: string, input: QuestionFormValues, updatedById?: string) {
  const { options, ...data } = input;

  return prisma.question.update({
    where: { id },
    data: {
      level: data.level,
      chapterId: data.chapterId || null,
      subtopicId: data.subtopicId || null,
      promptJson: data.promptJson as object,
      explanationJson: data.explanationJson ? data.explanationJson as object : undefined,
      questionType: data.questionType,
      difficulty: data.difficulty,
      isPublished: data.isPublished,
      updatedById,
      options: {
        deleteMany: { isDeleted: false },
        create: options.map((option) => ({
          contentJson: option.contentJson as object,
          isCorrect: option.isCorrect,
          orderIndex: option.orderIndex,
        })),
      },
    },
    include: { options: true },
  });
}

export async function deleteQuestion(id: string) {
  return prisma.question.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

export async function restoreQuestion(id: string) {
  return prisma.question.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
}