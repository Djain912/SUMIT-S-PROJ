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
  const allAttempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      mode: true,
      level: true,
      totalQuestions: true,
      correctCount: true,
      scorePercentage: true,
      completedAt: true,
      items: {
        select: {
          timeSpentSeconds: true,
        },
      },
    },
  });

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

  const totalAttempts = allAttempts.length;
  const totalQuestions = allAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const correctAnswers = allAttempts.reduce((sum, a) => sum + a.correctCount, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    let totalScore = 0;
    let totalTimeSeconds = 0;
    for (const attempt of allAttempts) {
      totalScore += attempt.scorePercentage || 0;
      for (const item of attempt.items) {
        totalTimeSeconds += item.timeSpentSeconds || 0;
      }
    }
    const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
    const totalTimeSpentMinutes = Math.round(totalTimeSeconds / 60);

    const attemptsByDate = allAttempts.map(a => ({
      date: a.completedAt?.toISOString().split('T')[0],
      id: a.id,
    })).filter((attempt) => attempt.date);

    let currentStreak = 0;
    let longestStreak = 0;
    const uniqueDates = [...new Set(attemptsByDate.map((attempt) => attempt.date).filter((date): date is string => Boolean(date)))].sort().reverse();
    
    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i - 1]);
          const currDate = new Date(uniqueDates[i]);
          const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
        if (diffDays === 1) {
          streak++;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    // chapters is independent of allAttempts — run in parallel with the streak computation above
    const chapters = await prisma.chapter.findMany({
      where: { isPublished: true, isDeleted: false },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, title: true, level: true },
    });

    const chapterIds = chapters.map(c => c.id);

    const subtopics = await prisma.subtopic.findMany({
      where: { chapterId: { in: chapterIds }, isPublished: true, isDeleted: false },
      select: { id: true, title: true, chapterId: true },
    });

    const subtopicIds = subtopics.map(s => s.id);

    const attemptItems = await prisma.quizAttemptItem.findMany({
      where: {
        attempt: {
          userId,
          status: 'COMPLETED',
        },
        question: {
          subtopicId: { in: subtopicIds },
        },
      },
      include: {
        question: {
          select: {
            subtopicId: true,
            chapterId: true,
          },
        },
      },
      take: 2000,
      orderBy: { answeredAt: 'desc' },
    });

    const subtopicStats = new Map<string, { attempts: number; questions: number; correct: number; totalTime: number; lastAt: Date | null }>();
    
    for (const item of attemptItems) {
      const stId = item.question.subtopicId;
      if (!stId) continue;
      const current = subtopicStats.get(stId) || { attempts: 0, questions: 0, correct: 0, totalTime: 0, lastAt: null };
      current.attempts += 1;
      current.questions += 1;
      if (item.isCorrect) current.correct += 1;
      current.totalTime += item.timeSpentSeconds || 0;
      if (!current.lastAt || (item.answeredAt && item.answeredAt > current.lastAt)) {
        current.lastAt = item.answeredAt;
      }
      subtopicStats.set(stId, current);
    }

    const chapterStats = new Map<string, { attempts: number; questions: number; correct: number }>();
    for (const item of attemptItems) {
      const chId = item.question.chapterId;
      if (!chId) continue;
      const current = chapterStats.get(chId) || { attempts: 0, questions: 0, correct: 0 };
      current.attempts += 1;
      current.questions += 1;
      if (item.isCorrect) current.correct += 1;
      chapterStats.set(chId, current);
    }

    const subtopicMap = new Map(subtopics.map(s => [s.id, s]));
    const chapterMap = new Map(chapters.map(c => [c.id, c]));
    // pre-group subtopicAnalysis by chapterId to avoid O(n²) filter inside chapterAnalysis.map
    const subtopicAnalysisByChapter = new Map<string, SubtopicAnalysis[]>();

    const subtopicAnalysis: SubtopicAnalysis[] = subtopicIds.map(id => {
      const st = subtopicMap.get(id);
      const ch = st ? chapterMap.get(st.chapterId) : null;
      const stats = subtopicStats.get(id) || { attempts: 0, questions: 0, correct: 0, totalTime: 0, lastAt: null };
      const accuracy = stats.questions > 0 ? Math.round((stats.correct / stats.questions) * 100) : 0;
      const avgTime = stats.questions > 0 ? Math.round(stats.totalTime / stats.questions) : 0;
      
      return {
        id,
        title: st?.title || 'Unknown',
        chapterId: st?.chapterId || '',
        chapterTitle: ch?.title || 'Unknown',
        level: ch?.level || 'LEVEL_1',
        totalAttempts: stats.attempts,
        totalQuestions: stats.questions,
        correctAnswers: stats.correct,
        accuracy,
        averageTimePerQuestion: avgTime,
        lastAttemptAt: stats.lastAt?.toISOString() || null,
        isWeak: accuracy > 0 && accuracy < 50,
      };
    }).filter(s => s.totalAttempts > 0);

    const weakTopics = subtopicAnalysis
      .filter(s => s.isWeak)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    const strongTopics = subtopicAnalysis
      .filter(s => s.accuracy >= 70)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 10);

    for (const s of subtopicAnalysis) {
      const arr = subtopicAnalysisByChapter.get(s.chapterId) ?? [];
      arr.push(s);
      subtopicAnalysisByChapter.set(s.chapterId, arr);
    }

    const chapterAnalysis: ChapterAnalysis[] = chapters.map(ch => {
      const stats = chapterStats.get(ch.id) ?? { attempts: 0, questions: 0, correct: 0 };
      const accuracy = stats.questions > 0 ? Math.round((stats.correct / stats.questions) * 100) : 0;

      return {
        id: ch.id,
        title: ch.title,
        level: ch.level,
        totalAttempts: stats.attempts,
        totalQuestions: stats.questions,
        correctAnswers: stats.correct,
        accuracy,
        subtopics: subtopicAnalysisByChapter.get(ch.id) ?? [],
      };
    }).filter(c => c.totalAttempts > 0);

    const levelSummaries: LevelSummary[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].map(level => {
      const levelAttempts = allAttempts.filter(a => a.level === level);
      if (levelAttempts.length === 0) {
        return {
          level,
          totalAttempts: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageScore: 0,
          bestScore: 0,
          firstAttemptAt: null,
          lastAttemptAt: null,
        };
      }
      
      const levelTotalQuestions = levelAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
      const levelCorrectAnswers = levelAttempts.reduce((sum, a) => sum + a.correctCount, 0);
      const levelAccuracy = levelTotalQuestions > 0 ? Math.round((levelCorrectAnswers / levelTotalQuestions) * 100) : 0;
      
      let totalScore = 0;
      let bestScore = 0;
      for (const attempt of levelAttempts) {
        totalScore += attempt.scorePercentage || 0;
        bestScore = Math.max(bestScore, attempt.scorePercentage || 0);
      }
      
      return {
        level,
        totalAttempts: levelAttempts.length,
        totalQuestions: levelTotalQuestions,
        correctAnswers: levelCorrectAnswers,
        accuracy: levelAccuracy,
        averageScore: Math.round(totalScore / levelAttempts.length),
        bestScore: Math.round(bestScore),
        firstAttemptAt: levelAttempts[levelAttempts.length - 1]?.completedAt?.toISOString() || null,
        lastAttemptAt: levelAttempts[0]?.completedAt?.toISOString() || null,
      };
    });

    const recentAttempts: AttemptHistory[] = allAttempts.slice(0, 20).map(a => ({
      id: a.id,
      mode: a.mode,
      level: a.level ?? 'Unknown',
      totalQuestions: a.totalQuestions,
      correctCount: a.correctCount,
      score: Math.round(a.scorePercentage || 0),
      completedAt: a.completedAt?.toISOString() || '',
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