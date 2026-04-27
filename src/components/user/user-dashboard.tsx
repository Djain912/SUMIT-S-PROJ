'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { Lock } from 'lucide-react';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export type SectionData = {
  id: string;
  title: string;
  chapters: ChapterData[];
};

export type ChapterData = {
  id: string;
  title: string;
  slug: string;
  subtopics: SubtopicData[];
  isLocked: boolean;
  progress: number;
  totalNotes: number;
  totalQuestions: number;
};

export type SubtopicData = {
  id: string;
  title: string;
  progress: number;
  totalQuestions: number;
  questionsAnswered: number;
  isLocked: boolean;
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

const dashboardInFlight = new Map<Level, Promise<DashboardData>>();

async function fetchDashboard(level: Level): Promise<DashboardData> {
  const response = await fetch(`/api/user/dashboard?level=${level}`);
  const payload = await response.json() as ApiResponse<DashboardData>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Failed to load dashboard');
  }
  return payload.data!;
}

function fetchDashboardInFlight(level: Level): Promise<DashboardData> {
  const existing = dashboardInFlight.get(level);
  if (existing) {
    return existing;
  }

  const request = fetchDashboard(level);
  dashboardInFlight.set(level, request);
  request.finally(() => {
    dashboardInFlight.delete(level);
  });

  return request;
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
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue-600"
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

interface ChapterRowProps {
  id: string;
  title: string;
  slug: string;
  subtopics?: SubtopicData[];
  isLocked?: boolean;
  progress?: number;
}

function ChapterRow({ id, title, slug, subtopics = [], isLocked = false, progress = 0 }: ChapterRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSubtopics = subtopics.length > 0;

return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasSubtopics ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 font-medium text-zinc-900"
            >
              <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              {title}
            </button>
          ) : (
            <span className="font-medium text-zinc-900">{title}</span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          {!isLocked && progress > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              progress >= 70 ? 'bg-green-100 text-green-700' :
              progress >= 50 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {progress}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/user/notes?chapter=${id}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600"
          >
            Notes
          </Link>
          <Link
            href={`/user/quiz?mode=CHAPTER&chapter=${id}`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Quiz
          </Link>
        </div>
      </div>
      {hasSubtopics && expanded && (
        <div className="flex flex-col gap-2 pt-2 pl-4">
          {subtopics.map((st) => (
            <div key={st.id} className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-700">{st.title}</span>
                  {st.questionsAnswered > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      st.progress >= 70 ? 'bg-green-100 text-green-700' :
                      st.progress >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {st.progress}%
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Link
                    href={`/user/notes?subtopic=${st.id}`}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
                  >
                    Notes
                  </Link>
                  <Link
                    href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`}
                    className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-600"
                  >
                    Quiz
                  </Link>
                </div>
              </div>
              {st.questionsAnswered > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500"
                    style={{ width: `${st.progress}%` }}
                  />
                </div>
              )}
            </div>
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

export function UserDashboardClient() {
  const [selectedLevel, setSelectedLevel] = useState<Level>('LEVEL_1');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (level: Level) => {
    setIsLoading(true);
    setError(null);
    try {
      const dashboardData = await fetchDashboardInFlight(level);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(selectedLevel);
  }, [selectedLevel, loadData]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-zinc-900">
            {selectedLevel.replace('_', ' ')}
          </h1>
          <p className="text-lg font-semibold text-blue-600">{data?.totalProgress ?? 0}%</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSelectedLevel(level)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                selectedLevel === level
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600'
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
          <div className="py-3 text-center text-sm text-red-600">{error}</div>
        ) : data ? (
          <ProgressStats
            totalProgress={data.totalProgress}
            assessmentScore={data.assessmentScore}
            totalQuestionsAnswered={data.totalQuestionsAnswered}
          />
        ) : null}
      </div>

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
        ) : (
          <>
            {data.sections.map((section) => (
              <SectionCard key={section.id} title={section.title}>
                {section.chapters.map((chapter) => (
                  <ChapterRow
                    key={chapter.id}
                    id={chapter.id}
                    title={chapter.title}
                    slug={chapter.slug}
                    subtopics={chapter.subtopics}
                    isLocked={chapter.isLocked}
                    progress={chapter.progress}
                  />
                ))}
              </SectionCard>
            ))}
          </>
        )}
      </div>
    </div>
  );
}