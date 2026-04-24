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

export async function resolveQuizQuestions(selection: QuizSelectionInput) {
  const where: Prisma.QuestionWhereInput = {
    isPublished: true,
  };

  const orConditions: Prisma.QuestionWhereInput[] = [];

  if (selection.level) {
    where.level = selection.level;
  }

  if (selection.selectedSubtopicIds.length > 0) {
    orConditions.push(
      { subtopicId: { in: selection.selectedSubtopicIds } },
      {
        subtopic: {
          id: { in: selection.selectedSubtopicIds },
        },
      },
    );
  }

  if (selection.selectedChapterIds.length > 0) {
    orConditions.push(
      { chapterId: { in: selection.selectedChapterIds } },
      {
        subtopic: {
          chapterId: { in: selection.selectedChapterIds },
        },
      },
    );
  }

  if (orConditions.length > 0) {
    where.OR = orConditions;
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
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          contentJson: true,
          orderIndex: true,
        },
      },
    },
  });

  const uniqueQuestions = Array.from(new Map(questions.map((question) => [question.id, question])).values());
  const orderedQuestions = selection.randomizeOrder ? shuffle(uniqueQuestions) : uniqueQuestions;

  return orderedQuestions.slice(0, selection.questionCount);
}

export async function startQuizAttempt(userId: string, selection: QuizSelectionInput) {
  const questions = await resolveQuizQuestions(selection);

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
      items: {
        orderBy: { questionOrder: 'asc' },
      },
    },
  });

  return attempt;
}

export async function recordQuizAnswer(userId: string, input: QuizAnswerInput) {
  const attemptItem = await prisma.quizAttemptItem.findFirst({
    where: {
      attemptId: input.attemptId,
      questionId: input.questionId,
      attempt: {
        userId,
      },
    },
    include: {
      question: {
        include: {
          options: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              contentJson: true,
              isCorrect: true,
              orderIndex: true,
            },
          },
        },
      },
    },
  });

  if (!attemptItem) {
    throw new Error('Quiz attempt item not found');
  }

  const selectedOption = attemptItem.question.options.find((option) => option.id === input.selectedOptionId);

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
  const attemptForUser = await prisma.quizAttempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
  });

  if (!attemptForUser) {
    throw new Error('Quiz attempt not found for user');
  }

  const items = await prisma.quizAttemptItem.findMany({
    where: { attemptId },
  });

  const correctCount = items.filter((item) => item.isCorrect).length;
  const totalQuestions = items.length;
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
      items: {
        orderBy: { questionOrder: 'asc' },
      },
    },
  });

  return attempt;
}

export async function getQuizAttemptReview(userId: string, attemptId: string) {
  return prisma.quizAttempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
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
