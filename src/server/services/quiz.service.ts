import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { QuizAnswerInput, QuizSelectionInput } from '@/server/validators/quiz';

function shuffle<T>(items: T[]) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

// Limits questions to a set of accessible chapters for scoped (coupon) users.
// Pass 'ALL' for admins / full-premium users (no restriction).
export type ChapterScope = 'ALL' | string[];

export async function resolveQuizQuestions(selection: QuizSelectionInput, scope: ChapterScope = 'ALL') {
  const where: Prisma.QuestionWhereInput = {
    isPublished: true,
    isDeleted: false,
  };

  if (selection.level) {
    where.level = selection.level;
  }

  // Build a single clean OR: subtopicId OR chapterId — no duplicate relation joins
  const orConditions: Prisma.QuestionWhereInput[] = [];

  if (selection.selectedSubtopicIds.length > 0) {
    orConditions.push({ subtopicId: { in: selection.selectedSubtopicIds } });
  }

  if (selection.selectedChapterIds.length > 0) {
    orConditions.push({ chapterId: { in: selection.selectedChapterIds } });
  }

  if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  // Scoped users: every returned question must belong to a chapter they hold
  // (directly via chapterId, or via its subtopic's chapter). An empty scope
  // means no access → no questions.
  if (scope !== 'ALL') {
    if (scope.length === 0) return [];
    where.AND = [{ OR: [{ chapterId: { in: scope } }, { subtopic: { chapterId: { in: scope } } }] }];
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      level: true,
      chapterId: true,
      subtopicId: true,
      promptJson: true,
      explanationJson: true,
      questionType: true,
      difficulty: true,
      options: {
        where: { isDeleted: false },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          contentJson: true,
          orderIndex: true,
        },
      },
    },
  });

  // DB unique index on id guarantees no duplication — no in-memory dedup needed
  const orderedQuestions = selection.randomizeOrder ? shuffle(questions) : questions;
  return orderedQuestions.slice(0, selection.questionCount);
}

export async function startQuizAttempt(userId: string, selection: QuizSelectionInput, scope: ChapterScope = 'ALL') {
  const questions = await resolveQuizQuestions(selection, scope);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      mode: selection.mode,
      level: selection.level,
      selectionJson: selection,
      totalQuestions: questions.length,
      status: 'IN_PROGRESS',
      items: {
        create: questions.map((question, index) => ({
          questionId: question.id,
          questionOrder: index + 1,
          questionSnapshotJson: question,
        })),
      },
    },
    include: {
      items: { orderBy: { questionOrder: 'asc' } },
    },
  });

  return attempt;
}

export async function recordQuizAnswer(userId: string, input: QuizAnswerInput) {
  // Fetch only the option correctness — no need to load all question data
  const [attemptItem, selectedOption] = await Promise.all([
    prisma.quizAttemptItem.findFirst({
      where: {
        attemptId: input.attemptId,
        questionId: input.questionId,
        attempt: { userId },
      },
      select: { id: true },
    }),
    prisma.questionOption.findFirst({
      where: {
        id: input.selectedOptionId,
        questionId: input.questionId,
      },
      select: { id: true, contentJson: true, isCorrect: true, orderIndex: true },
    }),
  ]);

  if (!attemptItem) {
    throw new Error('Quiz attempt item not found');
  }

  if (!selectedOption) {
    throw new Error('Selected option does not belong to the question');
  }

  const updatedItem = await prisma.quizAttemptItem.update({
    where: {
      attemptId_questionId: {
        attemptId: input.attemptId,
        questionId: input.questionId,
      },
    },
    data: {
      selectedOptionId: selectedOption.id,
      selectedOptionSnapshotJson: selectedOption,
      isCorrect: selectedOption.isCorrect,
      timeSpentSeconds: input.timeSpentSeconds,
    },
  });

  return updatedItem;
}

export async function completeQuizAttempt(userId: string, attemptId: string) {
  // Single query: aggregate correct count at DB level instead of fetching all items
  const [attemptForUser, aggregates] = await Promise.all([
    prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      select: { id: true, totalQuestions: true },
    }),
    prisma.quizAttemptItem.aggregate({
      where: { attemptId, isCorrect: true },
      _count: { id: true },
    }),
  ]);

  if (!attemptForUser) {
    throw new Error('Quiz attempt not found for user');
  }

  const correctCount = aggregates._count.id;
  const totalQuestions = attemptForUser.totalQuestions;
  const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  const attempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      correctCount,
      scorePercentage,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      items: { orderBy: { questionOrder: 'asc' } },
    },
  });

  return attempt;
}

export async function getQuizAttemptReview(userId: string, attemptId: string) {
  return prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      items: {
        orderBy: { questionOrder: 'asc' },
        include: {
          question: true,
          selectedOption: true,
        },
      },
    },
  });
}
