'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

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
  isLocked: boolean;
};

interface DashboardData {
  level: string;
  sections: SectionData[];
  totalProgress: number;
  assessmentScore: number;
  totalQuestionsAnswered: number;
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-zinc-700">Total Progress</span>
          <span className="text-zinc-500">{totalProgress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2">
          <span className="text-sm text-zinc-500">Score</span>
          <span className="text-lg font-semibold text-zinc-900">{assessmentScore}%</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2">
          <span className="text-sm text-zinc-500">Questions</span>
          <span className="text-lg font-semibold text-zinc-900">{totalQuestionsAnswered}</span>
        </div>
      </div>
    </div>
  );
}

interface ChapterRowProps {
  id: string;
  title: string;
  slug: string;
  subtopics?: { id: string; title: string }[];
  isLocked?: boolean;
  progress?: number;
}

function ChapterRow({ id, title, slug, subtopics = [], isLocked = false, progress = 0 }: ChapterRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSubtopics = subtopics.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasSubtopics ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 font-medium text-zinc-900 hover:text-blue-600"
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
            <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/user/notes?chapter=${id}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            Notes
          </Link>
          <Link
            href={`/user/quiz?mode=CHAPTER&chapter=${id}`}
            className="rounded-lg border border-zinc-200 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            Quiz
          </Link>
        </div>
      </div>
      {hasSubtopics && expanded && (
        <div className="mt-2 space-y-2 pl-6">
          {subtopics.map((st) => (
            <div key={st.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
              <span className="text-sm text-zinc-700">{st.title}</span>
              <div className="flex gap-1">
                <Link
                  href={`/user/notes?subtopic=${st.id}`}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                >
                  Notes
                </Link>
                <Link
                  href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`}
                  className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                >
                  Quiz
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLocked && progress > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{progress}%</span>
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
      <div className="border-b border-zinc-200 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">{title}</h3>
      </div>
      <div className="divide-y divide-zinc-100 p-3">{children}</div>
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
      const dashboardData = await fetchDashboard(level);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Course</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-900">
              {selectedLevel.replace('_', ' ')}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Progress</p>
            <p className="mt-1 text-lg font-semibold text-blue-600">
              {data?.totalProgress ?? 0}%
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSelectedLevel(level)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedLevel === level
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {level.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-zinc-500">Loading...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">{error}</div>
        ) : data ? (
          <ProgressStats
            totalProgress={data.totalProgress}
            assessmentScore={data.assessmentScore}
            totalQuestionsAnswered={data.totalQuestionsAnswered}
          />
        ) : null}
      </div>

      <div className="space-y-4">
        {isLoading || error || !data?.sections ? (
          <div className="py-8 text-center text-zinc-500">Select a level to view chapters</div>
        ) : (
          data.sections.map((section) => (
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
          ))
        )}
      </div>
    </div>
  );
}