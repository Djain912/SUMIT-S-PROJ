import { prisma } from '@/lib/db/prisma';
import type { QuestionFormValues } from '@/server/validators/admin-content';

export async function listQuestions(filters?: { chapterId?: string; subtopicId?: string; level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' }) {
  return prisma.question.findMany({
    where: {
      chapterId: filters?.chapterId,
      subtopicId: filters?.subtopicId,
      level: filters?.level,
    },
    include: {
      options: {
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
      ...data,
      createdById,
      updatedById: createdById,
      options: {
        create: options.map((option) => ({
          contentJson: option.contentJson,
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
      ...data,
      updatedById,
      options: {
        deleteMany: {},
        create: options.map((option) => ({
          contentJson: option.contentJson,
          isCorrect: option.isCorrect,
          orderIndex: option.orderIndex,
        })),
      },
    },
    include: { options: true },
  });
}

export async function deleteQuestion(id: string) {
  return prisma.question.delete({ where: { id } });
}
