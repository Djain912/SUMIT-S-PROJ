'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, ChevronRight, Search, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export type SectionData = {
  id: string;
  title: string;
  chapters: ChapterData[];
};

export type ChapterData = {
  id: string;
  title: string;
  orderIndex: number;
  subtopics: SubtopicData[];
  isLocked: boolean;
  progress: number;
  totalNotes: number;
  totalQuestions: number;
};

export type NoteShell = {
  id: string;
  title: string;
  orderIndex: number;
  isPublished: boolean;
};

export type SubtopicData = {
  id: string;
  title: string;
  orderIndex: number;
  progress: number;
  totalQuestions: number;
  questionsAnswered: number;
  isLocked: boolean;
  notes: NoteShell[];
};

interface DashboardData {
  level: string;
  sections: SectionData[];
  totalProgress: number;
  assessmentScore: number;
  totalQuestionsAnswered: number;
  recentAttempts?: {
    id: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    completedAt: string;
    mode: string;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const levelOptions: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

async function fetchDashboard(level: Level): Promise<DashboardData> {
  const response = await fetch(`/api/user/dashboard?level=${level}`);
  const payload = await response.json() as ApiResponse<DashboardData>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Failed to load dashboard');
  }
  return payload.data!;
}

interface ProgressStatsProps {
  totalProgress: number;
  assessmentScore: number;
  totalQuestionsAnswered: number;
}

export function ProgressStats({ totalProgress, assessmentScore, totalQuestionsAnswered }: ProgressStatsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-600">Progress</span>
            <span className="text-zinc-500">{totalProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
        <div className="flex gap-4 text-center">
          <div className="px-3">
            <p className="text-lg font-semibold text-zinc-950">{assessmentScore}%</p>
            <p className="text-xs text-zinc-500">Score</p>
          </div>
          <div className="px-3">
            <p className="text-lg font-semibold text-zinc-950">{totalQuestionsAnswered}</p>
            <p className="text-xs text-zinc-500">Questions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecentAttempt {
  id: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  completedAt: string;
  mode: string;
}

interface RecentAttemptsProps {
  attempts: RecentAttempt[];
}

export function RecentAttempts({ attempts }: RecentAttemptsProps) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-500">No quiz attempts yet. Start a quiz to track your progress.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-900">Recent attempts</h3>
      </div>
      <div className="divide-y divide-zinc-100">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow-sm ${
                  attempt.score >= 70
                    ? 'bg-emerald-100 text-emerald-700'
                    : attempt.score >= 50
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {Math.round(attempt.score)}%
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {attempt.mode.replace('_', ' ')} Quiz
                </p>
                <p className="text-xs text-zinc-500">
                  {attempt.correctCount}/{attempt.totalQuestions} correct
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-400">
              {new Date(attempt.completedAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function progressBadgeClass(p: number) {
  if (p >= 70) return 'bg-green-100 text-green-700';
  if (p >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

interface SubtopicRowProps {
  subtopic: SubtopicData;
  forceExpanded: boolean | null;
}

function SubtopicRow({ subtopic: st, forceExpanded }: SubtopicRowProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const hasNotes = st.notes.length > 0;
  // forceExpanded=true means expand all, false = collapse all, null = user controls locally
  const expanded = forceExpanded !== null ? forceExpanded : localExpanded;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasNotes ? (
            <button
              type="button"
              onClick={() => {
                // Local toggle always overrides forceExpanded after user interacts
                setLocalExpanded(!expanded);
              }}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {st.title}
            </button>
          ) : (
            <span className="text-sm text-zinc-700">{st.title}</span>
          )}
          {st.questionsAnswered > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${progressBadgeClass(st.progress)}`}>
              {st.progress}%
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Link
            href={`/user/notes?subtopic=${st.id}`}
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
          >
            Notes
          </Link>
          <Link
            href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`}
            className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 transition"
          >
            Quiz
          </Link>
        </div>
      </div>
      {st.questionsAnswered > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${st.progress}%` }}
          />
        </div>
      )}
      {hasNotes && expanded && (
        <div className="flex flex-col gap-1 pt-1 pl-4 border-l-2 border-zinc-200">
          {st.notes.map((note) => (
            <div key={note.id} className="flex items-center justify-between py-1">
              <span className="text-xs text-zinc-600">{note.title}</span>
              {note.isPublished ? (
                <Link
                  href={`/user/notes?note=${note.id}`}
                  className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
                >
                  Read
                </Link>
              ) : (
                <span className="rounded border border-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChapterRowProps {
  chapter: ChapterData;
  forceExpanded: boolean | null;
}

function ChapterRow({ chapter: ch, forceExpanded }: ChapterRowProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const hasSubtopics = ch.subtopics.length > 0;
  const expanded = forceExpanded !== null ? forceExpanded : localExpanded;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasSubtopics ? (
            <button
              type="button"
              onClick={() => setLocalExpanded(!expanded)}
              className="flex items-center gap-2 font-medium text-zinc-900"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              Chapter {ch.orderIndex}: {ch.title}
            </button>
          ) : (
            <span className="font-medium text-zinc-900">{ch.title}</span>
          )}
          {ch.isLocked && (
            <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          {!ch.isLocked && ch.progress > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${progressBadgeClass(ch.progress)}`}>
              {ch.progress}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/user/notes?chapter=${ch.id}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            Notes
          </Link>
          <Link
            href={`/user/quiz?mode=CHAPTER&chapter=${ch.id}`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            Quiz
          </Link>
        </div>
      </div>
      {hasSubtopics && expanded && (
        <div className="flex flex-col gap-2 pt-2 pl-4">
          {ch.subtopics.map((st) => (
            <SubtopicRow key={st.id} subtopic={st} forceExpanded={forceExpanded} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="flex flex-col divide-y divide-zinc-100">{children}</div>
    </div>
  );
}

export function UserDashboardClient({ initialData }: { initialData?: DashboardData }) {
  const [selectedLevel, setSelectedLevel] = useState<Level>(
    (initialData?.level as Level) ?? 'LEVEL_1',
  );
  const [search, setSearch] = useState('');
  // null = user controls per-row; true = expand all; false = collapse all
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedLevel],
    queryFn: () => fetchDashboard(selectedLevel),
    initialData: selectedLevel === ((initialData?.level as Level) ?? 'LEVEL_1') ? initialData : undefined,
    staleTime: 60_000,
  });

  // Client-side search: filter chapters/subtopics by title — no extra API calls
  const filteredSections = useMemo(() => {
    if (!data?.sections || !search.trim()) return data?.sections ?? [];
    const q = search.toLowerCase();
    return data.sections
      .map(section => ({
        ...section,
        chapters: section.chapters
          .map(ch => ({
            ...ch,
            subtopics: ch.subtopics.filter(st => st.title.toLowerCase().includes(q)),
          }))
          .filter(ch => ch.title.toLowerCase().includes(q) || ch.subtopics.length > 0),
      }))
      .filter(s => s.chapters.length > 0);
  }, [data?.sections, search]);

  const handleExpandAll = () => setForceExpanded(true);
  const handleCollapseAll = () => setForceExpanded(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-zinc-900">
            {selectedLevel.replace('_', ' ')}
          </h1>
          <p className="text-lg font-semibold text-indigo-600">{data?.totalProgress ?? 0}%</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => { setSelectedLevel(level); setSearch(''); setForceExpanded(null); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedLevel === level
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {level.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse py-1">
            <div className="h-2 w-full rounded-full bg-zinc-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-xl bg-zinc-100" />
              <div className="h-12 rounded-xl bg-zinc-100" />
            </div>
          </div>
        ) : error ? (
          <div className="py-3 text-center text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load'}</div>
        ) : data ? (
          <ProgressStats
            totalProgress={data.totalProgress}
            assessmentScore={data.assessmentScore}
            totalQuestionsAnswered={data.totalQuestionsAnswered}
          />
        ) : null}
      </div>

      {/* Search + expand/collapse toolbar */}
      {!isLoading && data && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setForceExpanded(true); }}
              placeholder="Search chapters & subtopics…"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />
          </div>
          <button
            type="button"
            onClick={handleExpandAll}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand all
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse all
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="h-4 w-44 rounded bg-zinc-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-14 rounded-lg bg-zinc-100" />
                  <div className="h-14 rounded-lg bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error || !data?.sections ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-8 text-center text-sm text-zinc-500">
            Select a level to view chapters.
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-8 text-center text-sm text-zinc-500">
            No chapters or subtopics match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredSections.map((section) => (
            <SectionCard key={section.id} title={section.title}>
              {section.chapters.map((chapter) => (
                <ChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  forceExpanded={search.trim() ? true : forceExpanded}
                />
              ))}
            </SectionCard>
          ))
        )}
      </div>
    </div>
  );
}
