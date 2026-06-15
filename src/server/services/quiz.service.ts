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

// ── Full-length mock test: official CMT Level I exam format ──────────────────
// 132 questions, 2-hour limit, drawn in the official knowledge-domain weights.
export const FULL_TEST_TOTAL = 132;
export const FULL_TEST_TIME_MINUTES = 120;

type CmtDomain = 'THEORY' | 'CLASSICAL' | 'ADVANCED' | 'ETHICS';

// Official CMT L1 domain weighting (from the curriculum knowledge-domain breakdown).
const DOMAIN_WEIGHTS: Record<CmtDomain, number> = {
  THEORY: 0.38,
  CLASSICAL: 0.33,
  ADVANCED: 0.26,
  ETHICS: 0.03,
};

// Maps each unit (chapter.orderIndex) to its CMT knowledge domain. Adjust here
// if the curriculum mapping changes. Units with no questions yet (e.g. XI
// Volatility, and Ethics which has no unit) are simply backfilled from others.
const DOMAIN_BY_UNIT: Record<number, CmtDomain> = {
  1: 'THEORY',        // Unit I: Theory & History
  7: 'THEORY',        // Unit VII: Behavioral Finance
  2: 'CLASSICAL',     // Unit II: Charts
  3: 'CLASSICAL',     // Unit III: Trend Analysis
  4: 'CLASSICAL',     // Unit IV: Chart Pattern Analysis
  5: 'CLASSICAL',     // Unit V: Technical Indicators
  8: 'CLASSICAL',     // Unit VIII: Sentiment
  9: 'CLASSICAL',     // Unit IX: Cycle Analysis
  6: 'ADVANCED',      // Unit VI: Statistics
  10: 'ADVANCED',     // Unit X: Comparative Market Analysis
  11: 'ADVANCED',     // Unit XI: Volatility
  12: 'ADVANCED',     // Unit XII: Systems & Quantitative Methods
};

// Picks ~132 question IDs for a full mock test, weighted by CMT domain. If a
// domain is short (or empty, like Ethics today), the shortfall is backfilled
// from the remaining pool so the student still gets a full-length paper.
async function pickFullTestQuestionIds(scope: ChapterScope): Promise<string[]> {
  const chapters = await prisma.chapter.findMany({
    where: { level: 'LEVEL_1', isPublished: true, isDeleted: false },
    select: { id: true, orderIndex: true },
  });
  const domainByChapter = new Map<string, CmtDomain>();
  for (const c of chapters) {
    const d = DOMAIN_BY_UNIT[c.orderIndex];
    if (d) domainByChapter.set(c.id, d);
  }

  const where: Prisma.QuestionWhereInput = {
    level: 'LEVEL_1',
    isPublished: true,
    isDeleted: false,
  };
  if (scope !== 'ALL') {
    if (scope.length === 0) return [];
    where.OR = [{ chapterId: { in: scope } }, { subtopic: { chapterId: { in: scope } } }];
  }

  const questions = await prisma.question.findMany({
    where,
    select: { id: true, chapterId: true, subtopic: { select: { chapterId: true } } },
  });

  // Bucket question IDs by domain (via their effective chapter).
  const byDomain: Record<CmtDomain, string[]> = { THEORY: [], CLASSICAL: [], ADVANCED: [], ETHICS: [] };
  for (const q of questions) {
    const chapterId = q.chapterId ?? q.subtopic?.chapterId ?? null;
    const domain = chapterId ? domainByChapter.get(chapterId) : undefined;
    if (domain) byDomain[domain].push(q.id);
  }
  for (const d of Object.keys(byDomain) as CmtDomain[]) byDomain[d] = shuffle(byDomain[d]);

  // Take each domain's weighted share, capped by what's actually available.
  const selected: string[] = [];
  const leftover: string[] = [];
  for (const d of Object.keys(DOMAIN_WEIGHTS) as CmtDomain[]) {
    const target = Math.round(DOMAIN_WEIGHTS[d] * FULL_TEST_TOTAL);
    const pool = byDomain[d];
    selected.push(...pool.slice(0, target));
    leftover.push(...pool.slice(target));
  }

  // Backfill any shortfall (e.g. empty Ethics) from the remaining pool.
  if (selected.length < FULL_TEST_TOTAL) {
    selected.push(...shuffle(leftover).slice(0, FULL_TEST_TOTAL - selected.length));
  }

  return shuffle(selected).slice(0, FULL_TEST_TOTAL);
}

// Fetches full question data for a fixed set of IDs (used by the full test),
// in randomised order.
async function fetchQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const questions = await prisma.question.findMany({
    where: { id: { in: ids } },
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
        select: { id: true, contentJson: true, orderIndex: true },
      },
    },
  });
  return shuffle(questions);
}

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
  // Full mock test: domain-weighted 132-question paper on the official CMT
  // timing. Other modes use the standard selection. We also stamp the time
  // limit into the stored selection so the client can run the countdown.
  let questions;
  let effectiveSelection = selection;
  if (selection.mode === 'FULL_TEST') {
    const ids = await pickFullTestQuestionIds(scope);
    questions = await fetchQuestionsByIds(ids);
    effectiveSelection = { ...selection, level: 'LEVEL_1', timeLimitMinutes: FULL_TEST_TIME_MINUTES };
  } else {
    questions = await resolveQuizQuestions(selection, scope);
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      mode: effectiveSelection.mode,
      level: effectiveSelection.level,
      selectionJson: effectiveSelection,
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
