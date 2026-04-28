import { prisma } from '@/lib/db/prisma';
import { requireAdminUser } from '@/server/policies/auth';
import { AdminChaptersClient } from '@/components/admin/admin-chapters-client';

export const dynamic = 'force-dynamic';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

function getSelectedLevel(level?: string): Level {
  return ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(level ?? '') ? (level as Level) : 'LEVEL_1';
}

async function getChaptersByLevel(level: Level) {
  return prisma.chapter.findMany({
    where: { level },
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: { select: { subtopics: true, questions: true } },
    },
  });
}

export default async function AdminChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; error?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
  const selectedLevel = getSelectedLevel(params?.level);
  const errorMessage = typeof params?.error === 'string' ? params.error : null;
  const chapters = await getChaptersByLevel(selectedLevel);

  return (
    <AdminChaptersClient
      selectedLevel={selectedLevel}
      chapters={chapters}
      errorMessage={errorMessage}
    />
  );
}
