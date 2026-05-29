import { prisma } from '@/lib/db/prisma';
import { requireAdminUser } from '@/server/policies/auth';
import { AdminSubtopicsClient } from '@/components/admin/admin-subtopics-client';

export const dynamic = 'force-dynamic';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

function getSelectedLevel(level?: string): Level {
  return ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(level ?? '') ? (level as Level) : 'LEVEL_1';
}

async function getChaptersWithSubtopics(level: Level) {
  return prisma.chapter.findMany({
    where: { level },
    orderBy: { orderIndex: 'asc' },
    include: {
      subtopics: {
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: { select: { notes: true, questions: true } },
        },
      },
    },
  });
}

export default async function AdminSubtopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; error?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
  const selectedLevel = getSelectedLevel(params?.level);
  const errorMessage = typeof params?.error === 'string' ? params.error : null;
  const chapters = await getChaptersWithSubtopics(selectedLevel);

  return (
    <AdminSubtopicsClient
      selectedLevel={selectedLevel}
      chapters={chapters}
      errorMessage={errorMessage}
    />
  );
}
