import { prisma } from '@/lib/db/prisma';
import { AdminLevelTabs, type AdminLevel } from '@/components/admin/admin-level-tabs';
import Link from 'next/link';

const levels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const;

function getSelectedLevel(level?: string): AdminLevel {
  return levels.includes(level as AdminLevel) ? (level as AdminLevel) : 'LEVEL_1';
}

function formatLevel(level: AdminLevel) {
  return level.replace('_', ' ').replace('LEVEL', 'Level');
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const selectedLevel = getSelectedLevel(params?.level);
  let stats = { chapters: 0, subtopics: 0, notes: 0, questions: 0, publishedQuestions: 0 } as { chapters: number; subtopics: number; notes: number; questions: number; publishedQuestions: number };

  try {
    // Fetch chapter IDs for this level once, then use them as filters — avoids
    // expensive nested relation traversal in counts.
    const chaptersForLevel = await prisma.chapter.findMany({
      where: { level: selectedLevel, isDeleted: false },
      select: { id: true },
    });
    const chapterIds = chaptersForLevel.map((c) => c.id);

    if (chapterIds.length === 0) {
      stats = { chapters: 0, subtopics: 0, notes: 0, questions: 0, publishedQuestions: 0 };
    } else {
      const subtopicsForLevel = await prisma.subtopic.findMany({
        where: { chapterId: { in: chapterIds }, isDeleted: false },
        select: { id: true },
      });
      const subtopicIds = subtopicsForLevel.map((s) => s.id);

      // Use level field only — all questions (seed + AI-generated) have level set,
      // and it avoids double-counting via OR across three fields.
      const questionWhere = { isDeleted: false, level: selectedLevel };

      const [notes, questions, publishedQuestions] = await Promise.all([
        prisma.note.count({
          where: { subtopicId: { in: subtopicIds }, isDeleted: false },
        }),
        prisma.question.count({ where: questionWhere }),
        prisma.question.count({ where: { ...questionWhere, isPublished: true } }),
      ]);

      stats = {
        chapters: chapterIds.length,
        subtopics: subtopicIds.length,
        notes,
        questions,
        publishedQuestions,
      };
    }
  } catch {
    stats = { chapters: 0, subtopics: 0, notes: 0, questions: 0, publishedQuestions: 0 };
  }

  const cards = [
    { label: 'Chapters', value: String(stats.chapters), sub: null, href: `/admin/chapters?level=${selectedLevel}` },
    { label: 'Subtopics', value: String(stats.subtopics), sub: null, href: `/admin/subtopics?level=${selectedLevel}` },
    { label: 'Study Notes', value: String(stats.notes), sub: null, href: `/admin/notes?level=${selectedLevel}` },
    {
      label: 'Questions',
      value: String(stats.publishedQuestions),
      sub: stats.questions !== stats.publishedQuestions
        ? `${stats.questions - stats.publishedQuestions} unpublished`
        : null,
      href: `/admin/questions?level=${selectedLevel}`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{formatLevel(selectedLevel)}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[1.7rem]">Overview</h2>
        </div>
        <AdminLevelTabs selectedLevel={selectedLevel} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <p className="text-sm font-medium text-zinc-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[2rem]">{item.value}</p>
            {item.sub && (
              <p className="mt-1 text-xs text-amber-600">{item.sub}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
