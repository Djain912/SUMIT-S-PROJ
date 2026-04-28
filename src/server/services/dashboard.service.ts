import { prisma } from '@/lib/db/prisma';

interface SubtopicProgress {
  id: string;
  title: string;
  progress: number;
  totalQuestions: number;
  questionsAnswered: number;
  isLocked: boolean;
}

interface ChapterProgress {
  id: string;
  title: string;
  chapterNo: number;
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
        where: {
          level: targetLevel,
          isPublished: true,
          isDeleted: false,
        },
        orderBy: { chapterNo: 'asc' },
        include: {
          subtopics: {
            where: { isPublished: true, isDeleted: false },
            orderBy: { subtopicNo: 'asc' },
            include: {
              notes: { where: { isPublished: true, isDeleted: false }, select: { id: true } },
              questions: { where: { isPublished: true, isDeleted: false }, select: { id: true } },
            },
          },
        },
      }),
      prisma.quizAttempt.findMany({
        where: {
          userId,
          level: targetLevel,
          status: 'COMPLETED',
        },
        select: { totalQuestions: true, correctCount: true, scorePercentage: true },
      }),
      prisma.quizAttemptItem.findMany({
        where: {
          attempt: { userId, level: targetLevel, status: 'COMPLETED' },
        },
        include: {
          question: { select: { subtopicId: true, chapterId: true } },
        },
        take: 2000,
        orderBy: { answeredAt: 'desc' },
      }),
    ]);

    const subtopicStats = new Map<string, { correct: number; total: number }>();
    const chapterStats = new Map<string, { correct: number; total: number }>();

    for (const item of attemptItems) {
      const stId = item.question?.subtopicId;
      const chId = item.question?.chapterId;
      
      if (stId) {
        const current = subtopicStats.get(stId) || { correct: 0, total: 0 };
        current.total += 1;
        if (item.isCorrect) current.correct += 1;
        subtopicStats.set(stId, current);
      }
      if (chId) {
        const current = chapterStats.get(chId) || { correct: 0, total: 0 };
        current.total += 1;
        if (item.isCorrect) current.correct += 1;
        chapterStats.set(chId, current);
      }
    }

    const totalQuestionsAnswered = attemptItems.length;
    
    let totalScore = 0;
    for (const attempt of quizAttempts) {
      totalScore += attempt.scorePercentage || 0;
    }
    const totalCompletedAttempts = quizAttempts.length;
    const assessmentScore = totalCompletedAttempts > 0 ? Math.round(totalScore / totalCompletedAttempts) : 0;

    const totalChapters = chapters.length;
    const completedChapters = Array.from(chapterStats.values()).filter(s => s.total > 0).length;
    const totalProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId, level: targetLevel, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { id: true, totalQuestions: true, correctCount: true, scorePercentage: true, completedAt: true, mode: true },
    });

    const sections: SectionData[] = [{
      id: 'section-chapters',
      title: 'Chapters',
      chapters: chapters.map((ch, index) => {
        const stats = chapterStats.get(ch.id) || { correct: 0, total: 0 };
        const totalQs = ch.subtopics.reduce((sum, st) => sum + st.questions.length, 0);
        const progress = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        
        return {
          id: ch.id,
          title: ch.title,
          chapterNo: ch.chapterNo,
          isLocked: index > 0 && (chapterStats.get(chapters[index - 1].id)?.total ?? 0) === 0,
          progress,
          totalNotes: ch.subtopics.reduce((sum, st) => sum + st.notes.length, 0),
          totalQuestions: totalQs,
          subtopics: ch.subtopics.map(st => {
            const stStats = subtopicStats.get(st.id) || { correct: 0, total: 0 };
            const stTotalQs = st.questions.length;
            const progress = stStats.total > 0 ? Math.round((stStats.correct / stStats.total) * 100) : 0;
            
            return {
              id: st.id,
              title: st.title,
              subtopicNo: st.subtopicNo,
              progress,
              totalQuestions: stTotalQs,
              questionsAnswered: stStats.total,
              isLocked: false,
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
        score: Math.round(a.scorePercentage || 0),
        totalQuestions: a.totalQuestions,
        correctCount: a.correctCount,
        completedAt: a.completedAt?.toISOString() || '',
        mode: a.mode,
      })),
    };
}