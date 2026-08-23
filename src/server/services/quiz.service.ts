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

// ── Full-length mock test: official CMT exam format per level ────────────────
export const FULL_TEST_TOTAL = 132; // L1 default (kept for backwards compat)
export const FULL_TEST_TIME_MINUTES = 120; // L1 default

export type CmtDomain = 'THEORY' | 'CLASSICAL' | 'ADVANCED' | 'APP_TA' | 'ETHICS';

type FullTestConfig = { total: number; minutes: number; weights: Record<CmtDomain, number> };

export const FULL_TEST_CONFIG: Record<string, FullTestConfig> = {
  LEVEL_1: {
    total: 132,
    minutes: 120,
    weights: { THEORY: 0.38, CLASSICAL: 0.33, ADVANCED: 0.26, APP_TA: 0.00, ETHICS: 0.03 },
  },
  LEVEL_2: {
    total: 170,
    minutes: 240,
    weights: { THEORY: 0.07, CLASSICAL: 0.40, ADVANCED: 0.40, APP_TA: 0.10, ETHICS: 0.03 },
  },
};

// Target difficulty mix WITHIN each domain's allocation (exam-realistic).
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  EASY: 0.25,
  MEDIUM: 0.50,
  HARD: 0.25,
};

// Maps each unit (chapter.orderIndex) to its CMT knowledge domain per level.
export const DOMAIN_BY_UNIT_L1: Record<number, CmtDomain> = {
  1: 'THEORY',     7: 'THEORY',
  2: 'CLASSICAL',  3: 'CLASSICAL',  4: 'CLASSICAL',  5: 'CLASSICAL',  8: 'CLASSICAL',  9: 'CLASSICAL',
  6: 'ADVANCED',   10: 'ADVANCED',  11: 'ADVANCED',  12: 'ADVANCED',
  13: 'ETHICS',
};

export const DOMAIN_BY_UNIT_L2: Record<number, CmtDomain> = {
  1: 'THEORY',     2: 'THEORY',
  3: 'CLASSICAL',  4: 'CLASSICAL',  5: 'CLASSICAL',  6: 'CLASSICAL',  7: 'CLASSICAL',
  8: 'ADVANCED',   9: 'ADVANCED',   10: 'ADVANCED',  11: 'ADVANCED',  12: 'ADVANCED',
  // Application of TA is tested across all chapters — backfilled from pool
  13: 'ETHICS',
};

// Picks question IDs for a full mock test, weighted by CMT domain for the given level.
async function pickFullTestQuestionIds(scope: ChapterScope, level: string): Promise<string[]> {
  const cfg = FULL_TEST_CONFIG[level] ?? FULL_TEST_CONFIG['LEVEL_1'];
  const domainMap = level === 'LEVEL_2' ? DOMAIN_BY_UNIT_L2 : DOMAIN_BY_UNIT_L1;

  const chapters = await prisma.chapter.findMany({
    where: { level: level as 'LEVEL_1' | 'LEVEL_2', isPublished: true, isDeleted: false },
    select: { id: true, orderIndex: true },
  });
  const domainByChapter = new Map<string, CmtDomain>();
  for (const c of chapters) {
    const d = domainMap[c.orderIndex];
    if (d) domainByChapter.set(c.id, d);
  }

  const where: Prisma.QuestionWhereInput = {
    level: level as 'LEVEL_1' | 'LEVEL_2',
    isPublished: true,
    isDeleted: false,
  };
  if (scope !== 'ALL') {
    if (scope.length === 0) return [];
    where.OR = [{ chapterId: { in: scope } }, { subtopic: { chapterId: { in: scope } } }];
  }

  const questions = await prisma.question.findMany({
    where,
    select: { id: true, chapterId: true, difficulty: true, subtopic: { select: { chapterId: true } } },
  });

  const emptyDiff = (): Record<Difficulty, string[]> => ({ EASY: [], MEDIUM: [], HARD: [] });
  const byDomain: Record<CmtDomain, Record<Difficulty, string[]>> = {
    THEORY: emptyDiff(), CLASSICAL: emptyDiff(), ADVANCED: emptyDiff(), APP_TA: emptyDiff(), ETHICS: emptyDiff(),
  };
  for (const q of questions) {
    const chapterId = q.chapterId ?? q.subtopic?.chapterId ?? null;
    const domain = chapterId ? domainByChapter.get(chapterId) : undefined;
    if (!domain) continue;
    const diff: Difficulty = q.difficulty === 'EASY' || q.difficulty === 'HARD' ? q.difficulty : 'MEDIUM';
    byDomain[domain][diff].push(q.id);
  }
  for (const d of Object.keys(byDomain) as CmtDomain[]) {
    for (const diff of Object.keys(DIFFICULTY_WEIGHTS) as Difficulty[]) {
      byDomain[d][diff] = shuffle(byDomain[d][diff]);
    }
  }

  const selected = new Set<string>();
  const pull = (pool: string[], n: number): number => {
    for (const id of pool) {
      if (n <= 0) break;
      if (selected.has(id)) continue;
      selected.add(id);
      n -= 1;
    }
    return n;
  };

  for (const d of Object.keys(cfg.weights) as CmtDomain[]) {
    const domainTarget = Math.round(cfg.weights[d] * cfg.total);
    if (domainTarget === 0) continue;
    const easyT = Math.round(DIFFICULTY_WEIGHTS.EASY * domainTarget);
    const hardT = Math.round(DIFFICULTY_WEIGHTS.HARD * domainTarget);
    const medT = domainTarget - easyT - hardT;
    let short = 0;
    short += pull(byDomain[d].EASY, easyT);
    short += pull(byDomain[d].MEDIUM, medT);
    short += pull(byDomain[d].HARD, hardT);
    if (short > 0) pull(shuffle([...byDomain[d].EASY, ...byDomain[d].MEDIUM, ...byDomain[d].HARD]), short);
  }

  if (selected.size < cfg.total) {
    const everything = shuffle(
      (Object.keys(byDomain) as CmtDomain[]).flatMap(d =>
        [...byDomain[d].EASY, ...byDomain[d].MEDIUM, ...byDomain[d].HARD],
      ),
    );
    pull(everything, cfg.total - selected.size);
  }

  return shuffle([...selected]).slice(0, cfg.total);
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
    const level = selection.level ?? 'LEVEL_1';
    const cfg = FULL_TEST_CONFIG[level] ?? FULL_TEST_CONFIG['LEVEL_1'];
    const ids = await pickFullTestQuestionIds(scope, level);
    questions = await fetchQuestionsByIds(ids);
    effectiveSelection = { ...selection, level, timeLimitMinutes: cfg.minutes };
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

  // Engagement counters for the onboarding checklist / trial-drip emails.
  // Fire-and-forget, fail-soft — must never block the quiz result.
  const timeSpentSeconds = attempt.items.reduce((sum, item) => sum + (item.timeSpentSeconds ?? 0), 0);
  prisma.userActivity
    .upsert({
      where: { userId },
      create: {
        userId,
        mcqAttempted: totalQuestions,
        mockAttempted: attempt.mode === 'FULL_TEST' ? 1 : 0,
        timeSpentSeconds,
      },
      update: {
        mcqAttempted: { increment: totalQuestions },
        mockAttempted: attempt.mode === 'FULL_TEST' ? { increment: 1 } : undefined,
        timeSpentSeconds: { increment: timeSpentSeconds },
      },
    })
    .catch((err) => console.error('[quiz] UserActivity update failed:', err));

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
