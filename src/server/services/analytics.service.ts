import { prisma } from '@/lib/db/prisma';

interface SubtopicAnalysis {
  id: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTimePerQuestion: number;
  lastAttemptAt: string | null;
  isWeak: boolean;
}

interface ChapterAnalysis {
  id: string;
  title: string;
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  subtopics: SubtopicAnalysis[];
}

interface AttemptHistory {
  id: string;
  mode: string;
  level: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  completedAt: string;
}

interface LevelSummary {
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
  bestScore: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
}

interface AnalyticsData {
  overallStats: {
    totalAttempts: number;
    totalQuestions: number;
    correctAnswers: number;
    overallAccuracy: number;
    averageScore: number;
    totalTimeSpentMinutes: number;
    currentStreak: number;
    longestStreak: number;
  };
  levelSummaries: LevelSummary[];
  weakTopics: SubtopicAnalysis[];
  strongTopics: SubtopicAnalysis[];
  chapterAnalysis: ChapterAnalysis[];
  recentAttempts: AttemptHistory[];
}

export async function getUserAnalyticsData(userId: string): Promise<AnalyticsData> {
  // Fetch all three in parallel — attempts are lightweight (no items relation), items capped at 500
  const [allAttempts, chapters, attemptItems] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        mode: true,
        level: true,
        totalQuestions: true,
        correctCount: true,
        scorePercentage: true,
        completedAt: true,
      },
    }),
    prisma.chapter.findMany({
      where: { isPublished: true, isDeleted: false },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        level: true,
        subtopics: {
          where: { isPublished: true, isDeleted: false },
          select: { id: true, title: true },
        },
      },
    }),
    // Cap at 500 most-recent items — sufficient for per-subtopic breakdown without OOM risk
    prisma.quizAttemptItem.findMany({
      where: { attempt: { userId, status: 'COMPLETED' } },
      select: {
        isCorrect: true,
        timeSpentSeconds: true,
        answeredAt: true,
        question: { select: { subtopicId: true, chapterId: true } },
      },
      orderBy: { answeredAt: 'desc' },
      take: 500,
    }),
  ]);

  if (allAttempts.length === 0) {
    return {
      overallStats: {
        totalAttempts: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        overallAccuracy: 0,
        averageScore: 0,
        totalTimeSpentMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      levelSummaries: [],
      weakTopics: [],
      strongTopics: [],
      chapterAnalysis: [],
      recentAttempts: [],
    };
  }

  // Overall stats from stored attempt-level aggregates (no item scan needed)
  const totalAttempts = allAttempts.length;
  let totalQuestions = 0;
  let correctAnswers = 0;
  let totalScore = 0;
  for (const a of allAttempts) {
    totalQuestions += a.totalQuestions;
    correctAnswers += a.correctCount;
    totalScore += a.scorePercentage ?? 0;
  }
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

  // Time spent from capped item sample (approximate but fast)
  let totalTimeSeconds = 0;
  for (const item of attemptItems) totalTimeSeconds += item.timeSpentSeconds ?? 0;
  const totalTimeSpentMinutes = Math.round(totalTimeSeconds / 60);

  // Streak: only needs attempt-level dates, never the items
  const uniqueDates = [
    ...new Set(
      allAttempts
        .map(a => a.completedAt?.toISOString().split('T')[0])
        .filter((d): d is string => Boolean(d)),
    ),
  ].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;

  if (uniqueDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = Math.round(
          (new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) / 86400000,
        );
        if (diff === 1) currentStreak++;
        else break;
      }
    }

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = Math.round(
        (new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) / 86400000,
      );
      if (diff === 1) streak++;
      else { longestStreak = Math.max(longestStreak, streak); streak = 1; }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Per-subtopic / per-chapter breakdown from capped items
  const subtopicStats = new Map<string, { questions: number; correct: number; totalTime: number; lastAt: Date | null }>();
  const chapterStats = new Map<string, { questions: number; correct: number }>();

  for (const item of attemptItems) {
    const stId = item.question.subtopicId;
    const chId = item.question.chapterId;
    if (stId) {
      const s = subtopicStats.get(stId) ?? { questions: 0, correct: 0, totalTime: 0, lastAt: null };
      s.questions++;
      if (item.isCorrect) s.correct++;
      s.totalTime += item.timeSpentSeconds ?? 0;
      if (!s.lastAt || (item.answeredAt && item.answeredAt > s.lastAt)) s.lastAt = item.answeredAt;
      subtopicStats.set(stId, s);
    }
    if (chId) {
      const c = chapterStats.get(chId) ?? { questions: 0, correct: 0 };
      c.questions++;
      if (item.isCorrect) c.correct++;
      chapterStats.set(chId, c);
    }
  }

  const subtopicAnalysisByChapter = new Map<string, SubtopicAnalysis[]>();
  const subtopicAnalysis: SubtopicAnalysis[] = [];

  for (const ch of chapters) {
    for (const st of ch.subtopics) {
      const stats = subtopicStats.get(st.id);
      if (!stats || stats.questions === 0) continue;
      const accuracy = Math.round((stats.correct / stats.questions) * 100);
      const entry: SubtopicAnalysis = {
        id: st.id,
        title: st.title,
        chapterId: ch.id,
        chapterTitle: ch.title,
        level: ch.level,
        totalAttempts: stats.questions,
        totalQuestions: stats.questions,
        correctAnswers: stats.correct,
        accuracy,
        averageTimePerQuestion: Math.round(stats.totalTime / stats.questions),
        lastAttemptAt: stats.lastAt?.toISOString() ?? null,
        isWeak: accuracy > 0 && accuracy < 50,
      };
      subtopicAnalysis.push(entry);
      const arr = subtopicAnalysisByChapter.get(ch.id) ?? [];
      arr.push(entry);
      subtopicAnalysisByChapter.set(ch.id, arr);
    }
  }

  const weakTopics = subtopicAnalysis.filter(s => s.isWeak).sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
  const strongTopics = subtopicAnalysis.filter(s => s.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy).slice(0, 10);

  const chapterAnalysis: ChapterAnalysis[] = chapters
    .flatMap(ch => {
      const stats = chapterStats.get(ch.id);
      if (!stats || stats.questions === 0) return [];
      return [{
        id: ch.id,
        title: ch.title,
        level: ch.level as string,
        totalAttempts: stats.questions,
        totalQuestions: stats.questions,
        correctAnswers: stats.correct,
        accuracy: Math.round((stats.correct / stats.questions) * 100),
        subtopics: subtopicAnalysisByChapter.get(ch.id) ?? [],
      }];
    });

  // Level summaries: purely from attempt-level data — no item scan
  const levelSummaries: LevelSummary[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].map(level => {
    const lvAttempts = allAttempts.filter(a => a.level === level);
    if (lvAttempts.length === 0) {
      return { level, totalAttempts: 0, totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageScore: 0, bestScore: 0, firstAttemptAt: null, lastAttemptAt: null };
    }
    let lvQ = 0, lvC = 0, lvScore = 0, lvBest = 0;
    for (const a of lvAttempts) {
      lvQ += a.totalQuestions;
      lvC += a.correctCount;
      lvScore += a.scorePercentage ?? 0;
      if ((a.scorePercentage ?? 0) > lvBest) lvBest = a.scorePercentage ?? 0;
    }
    return {
      level,
      totalAttempts: lvAttempts.length,
      totalQuestions: lvQ,
      correctAnswers: lvC,
      accuracy: lvQ > 0 ? Math.round((lvC / lvQ) * 100) : 0,
      averageScore: Math.round(lvScore / lvAttempts.length),
      bestScore: Math.round(lvBest),
      firstAttemptAt: lvAttempts[lvAttempts.length - 1]?.completedAt?.toISOString() ?? null,
      lastAttemptAt: lvAttempts[0]?.completedAt?.toISOString() ?? null,
    };
  });

  const recentAttempts: AttemptHistory[] = allAttempts.slice(0, 20).map(a => ({
    id: a.id,
    mode: a.mode,
    level: a.level ?? 'Unknown',
    totalQuestions: a.totalQuestions,
    correctCount: a.correctCount,
    score: Math.round(a.scorePercentage ?? 0),
    completedAt: a.completedAt?.toISOString() ?? '',
  }));

  return {
    overallStats: {
      totalAttempts,
      totalQuestions,
      correctAnswers,
      overallAccuracy,
      averageScore,
      totalTimeSpentMinutes,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
    },
    levelSummaries,
    weakTopics,
    strongTopics,
    chapterAnalysis,
    recentAttempts,
  };
}
