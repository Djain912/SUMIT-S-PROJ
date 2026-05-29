import { prisma } from '@/lib/db/prisma';

interface NoteShell {
  id: string;
  title: string;
  orderIndex: number;
  isPublished: boolean;
}

interface SubtopicProgress {
  id: string;
  title: string;
  orderIndex: number;
  progress: number;
  totalQuestions: number;
  questionsAnswered: number;
  isLocked: boolean;
  notes: NoteShell[];
}

interface ChapterProgress {
  id: string;
  title: string;
  orderIndex: number;
  isLocked: boolean;
  progress: number;
  totalNotes: number;
  totalQuestions: number;
  subtopics: SubtopicProgress[];
}

interface SectionData {
  id: string;
  title: string;
  chapters: ChapterProgress[];
}

export async function getUserDashboardData(userId: string, level: string) {
  const targetLevel = level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

  const [chapters, quizAttempts, attemptItems] = await Promise.all([
    prisma.chapter.findMany({
      where: { level: targetLevel, isPublished: true, isDeleted: false },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        orderIndex: true,
        subtopics: {
          where: { isPublished: true, isDeleted: false },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            notes: {
              where: { isDeleted: false },
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, orderIndex: true, isPublished: true },
            },
            // Use _count instead of fetching all question ids — no row data needed
            _count: { select: { questions: { where: { isPublished: true, isDeleted: false } } } },
          },
        },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, level: targetLevel, status: 'COMPLETED' },
      select: { id: true, totalQuestions: true, correctCount: true, scorePercentage: true, completedAt: true, mode: true },
    }),
    // Cap at 300 most-recent items — enough for per-subtopic accuracy on the dashboard
    prisma.quizAttemptItem.findMany({
      where: { attempt: { userId, level: targetLevel, status: 'COMPLETED' } },
      select: {
        isCorrect: true,
        question: { select: { subtopicId: true, chapterId: true } },
      },
      orderBy: { answeredAt: 'desc' },
      take: 300,
    }),
  ]);

  const subtopicStats = new Map<string, { correct: number; total: number }>();
  const chapterStats = new Map<string, { correct: number; total: number }>();

  for (const item of attemptItems) {
    const stId = item.question?.subtopicId;
    const chId = item.question?.chapterId;
    if (stId) {
      const s = subtopicStats.get(stId) ?? { correct: 0, total: 0 };
      s.total++;
      if (item.isCorrect) s.correct++;
      subtopicStats.set(stId, s);
    }
    if (chId) {
      const c = chapterStats.get(chId) ?? { correct: 0, total: 0 };
      c.total++;
      if (item.isCorrect) c.correct++;
      chapterStats.set(chId, c);
    }
  }

  let totalScore = 0;
  for (const a of quizAttempts) totalScore += a.scorePercentage ?? 0;
  const totalCompletedAttempts = quizAttempts.length;
  const assessmentScore = totalCompletedAttempts > 0 ? Math.round(totalScore / totalCompletedAttempts) : 0;
  const totalQuestionsAnswered = attemptItems.length;

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(ch => (chapterStats.get(ch.id)?.total ?? 0) > 0).length;
  const totalProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const recentAttempts = [...quizAttempts]
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 5);

  const sections: SectionData[] = [{
    id: 'section-chapters',
    title: 'Chapters',
    chapters: chapters.map((ch, index) => {
      const stats = chapterStats.get(ch.id) ?? { correct: 0, total: 0 };
      const totalQs = ch.subtopics.reduce((sum, st) => sum + st._count.questions, 0);
      const progress = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

      return {
        id: ch.id,
        title: ch.title,
        orderIndex: ch.orderIndex,
        isLocked: false,
        progress,
        totalNotes: ch.subtopics.reduce((sum, st) => sum + st.notes.length, 0),
        totalQuestions: totalQs,
        subtopics: ch.subtopics.map(st => {
          const stStats = subtopicStats.get(st.id) ?? { correct: 0, total: 0 };
          return {
            id: st.id,
            title: st.title,
            orderIndex: st.orderIndex,
            progress: stStats.total > 0 ? Math.round((stStats.correct / stStats.total) * 100) : 0,
            totalQuestions: st._count.questions,
            questionsAnswered: stStats.total,
            isLocked: false,
            notes: st.notes,
          };
        }),
      };
    }),
  }];

  return {
    level,
    sections,
    totalProgress,
    assessmentScore,
    totalQuestionsAnswered,
    recentAttempts: recentAttempts.map(a => ({
      id: a.id,
      score: Math.round(a.scorePercentage ?? 0),
      totalQuestions: a.totalQuestions,
      correctCount: a.correctCount,
      completedAt: a.completedAt?.toISOString() ?? '',
      mode: a.mode,
    })),
  };
}
