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
  let stats = { chapters: 0, subtopics: 0, notes: 0, questions: 0 };

  try {
    const [chapters, subtopics, notes, questions] = await Promise.all([
      prisma.chapter.count({ where: { level: selectedLevel } }),
      prisma.subtopic.count({ where: { chapter: { level: selectedLevel } } }),
      prisma.note.count({ where: { subtopic: { chapter: { level: selectedLevel } } } }),
      prisma.question.count({
        where: {
          OR: [
            { level: selectedLevel },
            { chapter: { level: selectedLevel } },
            { subtopic: { chapter: { level: selectedLevel } } },
          ],
        },
      }),
    ]);
    stats = { chapters, subtopics, notes, questions };
  } catch {
    stats = { chapters: 0, subtopics: 0, notes: 0, questions: 0 };
  }

  const cards = [
    { label: 'Chapters', value: stats.chapters, href: `/admin/chapters?level=${selectedLevel}` },
    { label: 'Subtopics', value: stats.subtopics, href: `/admin/subtopics?level=${selectedLevel}` },
    { label: 'Study Notes', value: stats.notes, href: `/admin/notes?level=${selectedLevel}` },
    { label: 'Questions', value: stats.questions, href: `/admin/questions?level=${selectedLevel}` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{formatLevel(selectedLevel)}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Curriculum Overview</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Review the structure and readiness of study content before students see it.
          </p>
        </div>
        <AdminLevelTabs selectedLevel={selectedLevel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
          >
            <p className="text-sm font-medium text-zinc-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{item.value}</p>
            <p className="mt-3 text-sm font-medium text-zinc-500 transition group-hover:text-zinc-950">
              Open section
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Level Structure</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Keep each exam level organized into chapters, subtopics, notes, and question banks.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {levels.map((level) => (
            <div key={level} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">{formatLevel(level)}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Dedicated curriculum path for this level.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
