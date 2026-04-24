import { prisma } from '@/lib/db/prisma';

export async function getUserDashboardData(userId: string, level: string) {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { level: level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' },
      orderBy: { orderIndex: 'asc' },
      include: {
        subtopics: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const published = chapters.filter(c => c.isPublished);

    const sections = [
      {
        id: 'section-chapters',
        title: 'Chapters' as const,
        chapters: published.map(ch => ({
          id: ch.id,
          title: ch.title,
          slug: ch.slug,
          isLocked: false,
          progress: 0,
          totalNotes: 0,
          totalQuestions: 0,
          subtopics: ch.subtopics
            .filter(st => st.isPublished)
            .map(st => ({
              id: st.id,
              title: st.title,
              progress: 0,
              isLocked: false,
            })),
        })),
      },
    ];

    return {
      level,
      sections,
      totalProgress: 0,
      assessmentScore: 0,
      totalQuestionsAnswered: 0,
    };
  } catch (error) {
    console.error('Dashboard service error:', error);
    return {
      level,
      sections: [{
        id: 'section-chapters',
        title: 'Chapters' as const,
        chapters: [] as {}[]
      }],
      totalProgress: 0,
      assessmentScore: 0,
      totalQuestionsAnswered: 0,
    };
  }
}