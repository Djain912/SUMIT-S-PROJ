'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, Search, ChevronsDownUp, ChevronsUpDown,
  BookOpen, Brain, FileText, LayoutGrid, TrendingUp, Lock,
} from 'lucide-react';

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
const lockedLevels: Level[] = ['LEVEL_2', 'LEVEL_3'];
const levelLabels: Record<Level, string> = {
  LEVEL_1: 'Level I',
  LEVEL_2: 'Level II',
  LEVEL_3: 'Level III',
};

async function fetchDashboard(level: Level): Promise<DashboardData> {
  const response = await fetch(`/api/user/dashboard?level=${level}`);
  const payload = await response.json() as ApiResponse<DashboardData>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? 'Failed to load dashboard');
  return payload.data!;
}

function progressColor(p: number) {
  if (p >= 70) return 'bg-emerald-500';
  if (p >= 40) return 'bg-amber-400';
  return 'bg-rose-500';
}

function progressBadge(p: number) {
  if (p >= 70) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (p >= 40) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
}

interface ProgressStatsProps {
  totalProgress: number;
  assessmentScore: number;
  totalQuestionsAnswered: number;
}

export function ProgressStats({ totalProgress, assessmentScore, totalQuestionsAnswered }: ProgressStatsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Overall Progress</span>
          <span className="text-xs font-bold text-zinc-900">{totalProgress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full transition-all duration-500 ${progressColor(totalProgress)}`} style={{ width: `${totalProgress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl bg-zinc-50 px-4 py-3 border border-zinc-100">
          <p className="text-2xl font-bold text-zinc-900 font-heading">{assessmentScore}%</p>
          <p className="text-xs text-zinc-500 mt-0.5">Avg. Score</p>
        </div>
        <div className="rounded-xl bg-zinc-50 px-4 py-3 border border-zinc-100">
          <p className="text-2xl font-bold text-zinc-900 font-heading">{totalQuestionsAnswered}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Qs Answered</p>
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <Brain className="mx-auto mb-3 h-8 w-8 text-zinc-200" />
        <p className="text-sm text-zinc-500">No quiz attempts yet. Start a quiz to track your progress.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-3.5 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Recent Attempts</h3>
      </div>
      <div className="divide-y divide-zinc-50">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                attempt.score >= 70 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : attempt.score >= 50 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
              }`}>
                {Math.round(attempt.score)}%
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">{attempt.mode.replace(/_/g, ' ')} Quiz</p>
                <p className="text-xs text-zinc-400">{attempt.correctCount}/{attempt.totalQuestions} correct</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 tabular-nums">
              {new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SubtopicRowProps {
  subtopic: SubtopicData;
  forceExpanded: boolean | null;
}

function SubtopicRow({ subtopic: st, forceExpanded }: SubtopicRowProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const hasNotes = st.notes.length > 0;
  const expanded = forceExpanded !== null ? forceExpanded : localExpanded;

  return (
    <div className="rounded-lg border border-zinc-100 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {hasNotes ? (
            <button
              type="button"
              onClick={() => setLocalExpanded(!expanded)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              <span className="truncate text-sm text-zinc-700">{st.title}</span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-sm text-zinc-700">{st.title}</span>
            </div>
          )}
          {st.questionsAnswered > 0 && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${progressBadge(st.progress)}`}>
              {st.progress}%
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link href={`/user/notes?subtopic=${st.id}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50">
            <FileText className="h-3 w-3" />
            Notes
          </Link>
          <Link href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`} className="inline-flex items-center gap-1 rounded-md border border-emerald-700 bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-600">
            <Brain className="h-3 w-3" />
            Quiz
          </Link>
        </div>
      </div>
      {st.questionsAnswered > 0 && (
        <div className="px-3 pb-2.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full transition-all duration-500 ${progressColor(st.progress)}`} style={{ width: `${st.progress}%` }} />
          </div>
        </div>
      )}
      {hasNotes && expanded && (
        <div className="border-t border-zinc-100 px-3 pb-2.5 pt-2">
          <div className="flex flex-col gap-1 pl-5 border-l-2 border-zinc-100">
            {st.notes.map((note) => (
              <div key={note.id} className="flex items-center justify-between py-0.5">
                <span className="text-xs text-zinc-500">{note.title}</span>
                {note.isPublished ? (
                  <Link href={`/user/notes?note=${note.id}`} className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 transition">
                    Read
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-300">Soon</span>
                )}
              </div>
            ))}
          </div>
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
    <div className="border-b border-zinc-100 last:border-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {hasSubtopics ? (
            <button type="button" onClick={() => setLocalExpanded(!expanded)} className="flex min-w-0 items-center gap-2.5">
              <ChevronRight className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              <span className="text-sm font-semibold text-zinc-900 text-left truncate">{ch.title}</span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold text-zinc-900 truncate">{ch.title}</span>
            </div>
          )}
          {ch.progress > 0 && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${progressBadge(ch.progress)}`}>
              {ch.progress}%
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link href={`/user/notes?chapter=${ch.id}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </Link>
          <Link href={`/user/quiz?mode=CHAPTER&chapter=${ch.id}`} className="inline-flex items-center gap-1 rounded-md border border-emerald-700 bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600">
            <Brain className="h-3.5 w-3.5" />
            Quiz
          </Link>
        </div>
      </div>
      {ch.progress > 0 && (
        <div className="px-4 pb-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full transition-all duration-500 ${progressColor(ch.progress)}`} style={{ width: `${ch.progress}%` }} />
          </div>
        </div>
      )}
      {hasSubtopics && expanded && (
        <div className="flex flex-col gap-2 bg-zinc-50/60 px-4 pb-4 pt-2">
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
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function UserDashboardClient({ initialData }: { initialData?: DashboardData }) {
  const initialLevel = (initialData?.level as Level) ?? 'LEVEL_1';
  const [selectedLevel, setSelectedLevel] = useState<Level>(
    lockedLevels.includes(initialLevel) ? 'LEVEL_1' : initialLevel,
  );
  const [search, setSearch] = useState('');
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedLevel],
    queryFn: () => fetchDashboard(selectedLevel),
    initialData: selectedLevel === ((initialData?.level as Level) ?? 'LEVEL_1') ? initialData : undefined,
    staleTime: 60_000,
  });

  const filteredSections = useMemo(() => {
    if (!data?.sections || !search.trim()) return data?.sections ?? [];
    const q = search.toLowerCase();
    return data.sections
      .map(section => ({
        ...section,
        chapters: section.chapters
          .map(ch => ({ ...ch, subtopics: ch.subtopics.filter(st => st.title.toLowerCase().includes(q)) }))
          .filter(ch => ch.title.toLowerCase().includes(q) || ch.subtopics.length > 0),
      }))
      .filter(s => s.chapters.length > 0);
  }, [data?.sections, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Level tabs */}
        <div className="flex border-b border-zinc-100">
          {levelOptions.map((level) => {
            const locked = lockedLevels.includes(level);
            if (locked) {
              return (
                <div
                  key={level}
                  title="Coming Soon"
                  className="flex flex-1 cursor-not-allowed flex-col items-center justify-center gap-0.5 py-2.5 text-zinc-300"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Lock className="h-3.5 w-3.5" /> {levelLabels[level]}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Coming Soon</span>
                </div>
              );
            }
            return (
              <button
                key={level}
                type="button"
                onClick={() => { setSelectedLevel(level); setSearch(''); setForceExpanded(null); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  selectedLevel === level
                    ? 'bg-emerald-700 text-white'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
              >
                {levelLabels[level]}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-2 w-full rounded-full bg-zinc-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-xl bg-zinc-50" />
                <div className="h-16 rounded-xl bg-zinc-50" />
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600">{error instanceof Error ? error.message : 'Failed to load'}</p>
          ) : data ? (
            <ProgressStats
              totalProgress={data.totalProgress}
              assessmentScore={data.assessmentScore}
              totalQuestionsAnswered={data.totalQuestionsAnswered}
            />
          ) : null}
        </div>
      </div>

      {/* Search + toolbar */}
      {!isLoading && data && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setForceExpanded(true); }}
              placeholder="Search chapters & subtopics…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setForceExpanded(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand
          </button>
          <button
            type="button"
            onClick={() => setForceExpanded(false)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse
          </button>
        </div>
      )}

      {/* Chapter list */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="h-4 w-44 rounded bg-zinc-100" />
                <div className="mt-4 space-y-2">
                  <div className="h-12 rounded-lg bg-zinc-50" />
                  <div className="h-12 rounded-lg bg-zinc-50" />
                </div>
              </div>
            ))}
          </div>
        ) : error || !data?.sections ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-zinc-200" />
            <p className="text-sm text-zinc-400">Select a level to view chapters.</p>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-zinc-200" />
            <p className="text-sm text-zinc-400">No results for &ldquo;{search}&rdquo;</p>
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
