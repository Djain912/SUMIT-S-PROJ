'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Target, Clock, Zap, Award, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';

interface LevelSummary {
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
  bestScore: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
}

interface SubtopicAnalysis {
  id: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTimePerQuestion: number;
  lastAttemptAt: string | null;
  isWeak: boolean;
}

interface ChapterAnalysis {
  id: string;
  title: string;
  level: string;
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  subtopics: SubtopicAnalysis[];
}

interface AttemptHistory {
  id: string;
  mode: string;
  level: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  completedAt: string;
}

interface AnalyticsData {
  overallStats: {
    totalAttempts: number;
    totalQuestions: number;
    correctAnswers: number;
    overallAccuracy: number;
    averageScore: number;
    totalTimeSpentMinutes: number;
    currentStreak: number;
    longestStreak: number;
  };
  levelSummaries: LevelSummary[];
  weakTopics: SubtopicAnalysis[];
  strongTopics: SubtopicAnalysis[];
  chapterAnalysis: ChapterAnalysis[];
  recentAttempts: AttemptHistory[];
}

interface ApiResponse {
  success: boolean;
  data?: AnalyticsData;
  error?: { message?: string };
}

const analyticsInFlight = new Set<Promise<AnalyticsData>>();

async function fetchAnalytics(): Promise<AnalyticsData> {
  const response = await fetch('/api/user/analytics');
  const payload = await response.json() as ApiResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Failed to load analytics');
  }
  return payload.data!;
}

function fetchAnalyticsInFlight(): Promise<AnalyticsData> {
  if (analyticsInFlight.size > 0) {
    return Array.from(analyticsInFlight)[0];
  }
  const request = fetchAnalytics();
  analyticsInFlight.add(request);
  request.finally(() => analyticsInFlight.clear());
  return request;
}

export function UserAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'weak' | 'strong' | 'history'>('overview');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const analyticsData = await fetchAnalyticsInFlight();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-zinc-500">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  const { overallStats, levelSummaries, weakTopics, strongTopics, chapterAnalysis, recentAttempts } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Overall Accuracy</p>
              <p className="text-2xl font-semibold text-zinc-900">{overallStats.overallAccuracy}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Average Score</p>
              <p className="text-2xl font-semibold text-zinc-900">{overallStats.averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Time Spent</p>
              <p className="text-2xl font-semibold text-zinc-900">{overallStats.totalTimeSpentMinutes}m</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Current Streak</p>
              <p className="text-2xl font-semibold text-zinc-900">{overallStats.currentStreak} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-900">Performance by Level</h3>
            <div className="space-y-4">
              {levelSummaries.map((level) => (
                <div key={level.level} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-zinc-700">{level.level.replace('_', ' ')}</div>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${level.accuracy >= 70 ? 'bg-green-500' : level.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${level.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-zinc-600">{level.accuracy}%</div>
                  <div className="w-16 text-right text-xs text-zinc-400">{level.totalAttempts} attempts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-900">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total Attempts</span>
              <span className="font-medium text-zinc-900">{overallStats.totalAttempts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Questions Answered</span>
              <span className="font-medium text-zinc-900">{overallStats.totalQuestions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Correct Answers</span>
              <span className="font-medium text-green-600">{overallStats.correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Best Streak</span>
              <span className="font-medium text-zinc-900">{overallStats.longestStreak} days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zinc-200">
        {(['overview', 'weak', 'strong', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab === 'overview' && 'Chapter Analysis'}
            {tab === 'weak' && `Weak Topics (${weakTopics.length})`}
            {tab === 'strong' && `Strong Topics (${strongTopics.length})`}
            {tab === 'history' && 'Attempt History'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {chapterAnalysis.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">No chapter data yet. Start a quiz to see your progress!</p>
              <Link href="/user/quiz" className="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                Start Quiz
              </Link>
            </div>
          ) : (
            chapterAnalysis.map((chapter) => (
              <div key={chapter.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-zinc-900">{chapter.title}</h4>
                    <p className="text-xs text-zinc-500">{chapter.level.replace('_', ' ')} - {chapter.totalAttempts} attempts</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${chapter.accuracy >= 70 ? 'text-green-600' : chapter.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {chapter.accuracy}%
                    </p>
                    <p className="text-xs text-zinc-500">{chapter.correctAnswers}/{chapter.totalQuestions} correct</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {chapter.subtopics.map((st) => (
                    <div key={st.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {st.isWeak ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : st.accuracy >= 70 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <span className="text-sm text-zinc-700">{st.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{st.totalQuestions} Qs</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          st.accuracy >= 70 ? 'bg-green-100 text-green-700' :
                          st.accuracy >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {st.accuracy}%
                        </span>
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
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'weak' && (
        <div className="space-y-4">
          {weakTopics.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-green-300" />
              <p className="text-sm text-zinc-500">Great job! No weak topics found yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Topics Needing Work
              </h3>
              <div className="space-y-3">
                {weakTopics.map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{topic.title}</p>
                      <p className="text-xs text-zinc-500">{topic.chapterTitle} - {topic.level.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{topic.accuracy}%</p>
                        <p className="text-xs text-zinc-500">{topic.correctAnswers}/{topic.totalQuestions}</p>
                      </div>
                      <Link
                        href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`}
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Practice Quiz
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'strong' && (
        <div className="space-y-4">
          {strongTopics.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <TrendingDown className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">Keep practicing to build strong topics!</p>
            </div>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-green-900">
                <CheckCircle2 className="h-5 w-5" />
                Strong Topics
              </h3>
              <div className="space-y-3">
                {strongTopics.map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{topic.title}</p>
                      <p className="text-xs text-zinc-500">{topic.chapterTitle} - {topic.level.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{topic.accuracy}%</p>
                        <p className="text-xs text-zinc-500">{topic.correctAnswers}/{topic.totalQuestions}</p>
                      </div>
                      <Link
                        href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`}
                        className="rounded-full border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                      >
                        Keep Sharp
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {recentAttempts.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">No quiz attempts yet.</p>
              <Link href="/user/quiz" className="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                Start Your First Quiz
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-5 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">Recent Attempts</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          attempt.score >= 70
                            ? 'bg-green-100 text-green-700'
                            : attempt.score >= 50
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {attempt.score}%
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {attempt.mode.replace('_', ' ')} Quiz - {attempt.level.replace('_', ' ')}
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
          )}
        </div>
      )}
    </div>
  );
}