'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Target, Clock, Zap, Award, AlertTriangle, CheckCircle2, BarChart3, BookOpen } from 'lucide-react';

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
  if (analyticsInFlight.size > 0) return Array.from(analyticsInFlight)[0];
  const request = fetchAnalytics();
  analyticsInFlight.add(request);
  request.finally(() => analyticsInFlight.clear());
  return request;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-100 text-emerald-700' :
    score >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-rose-100 text-rose-700';
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${color}`}>
      {score}%
    </span>
  );
}

function AccuracyBar({ value }: { value: number }) {
  const color =
    value >= 70 ? 'bg-emerald-500' :
    value >= 50 ? 'bg-amber-500' :
    'bg-rose-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

const tabs = [
  { id: 'overview', label: 'Chapter Analysis' },
  { id: 'weak', label: 'Needs Work' },
  { id: 'strong', label: 'Strong Topics' },
  { id: 'history', label: 'History' },
] as const;

type Tab = typeof tabs[number]['id'];

export function UserAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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

  useEffect(() => { void loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-zinc-100 bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-48 rounded-2xl border border-zinc-100 bg-white shadow-sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-zinc-100 bg-white">
        <p className="text-sm text-rose-600">{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  const { overallStats, levelSummaries, weakTopics, strongTopics, chapterAnalysis, recentAttempts } = data;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Overall Accuracy',
            value: `${overallStats.overallAccuracy}%`,
            icon: Target,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            sub: `${overallStats.correctAnswers} of ${overallStats.totalQuestions} correct`,
          },
          {
            label: 'Average Score',
            value: `${overallStats.averageScore}%`,
            icon: Award,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            sub: `${overallStats.totalAttempts} total attempts`,
          },
          {
            label: 'Time Studied',
            value: `${overallStats.totalTimeSpentMinutes}m`,
            icon: Clock,
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600',
            sub: 'Total study time',
          },
          {
            label: 'Current Streak',
            value: `${overallStats.currentStreak}d`,
            icon: Zap,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            sub: `Best: ${overallStats.longestStreak} days`,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-950">{card.value}</p>
                  <p className="mt-1 text-xs text-zinc-400">{card.sub}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Level performance + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold text-zinc-900">Performance by Level</h3>
          {levelSummaries.length === 0 ? (
            <p className="text-sm text-zinc-400">No quiz data yet. Start a quiz to see level performance.</p>
          ) : (
            <div className="space-y-5">
              {levelSummaries.map((level) => (
                <div key={level.level}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">{level.level.replace('_', ' ')}</span>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{level.totalAttempts} attempts</span>
                      <span className="font-semibold text-zinc-900">{level.accuracy}%</span>
                    </div>
                  </div>
                  <AccuracyBar value={level.accuracy} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold text-zinc-900">Summary</h3>
          <dl className="space-y-4">
            {[
              { label: 'Total Attempts', value: overallStats.totalAttempts, color: '' },
              { label: 'Questions Answered', value: overallStats.totalQuestions, color: '' },
              { label: 'Correct Answers', value: overallStats.correctAnswers, color: 'text-emerald-600' },
              { label: 'Best Streak', value: `${overallStats.longestStreak} days`, color: '' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                <dt className="text-sm text-zinc-500">{row.label}</dt>
                <dd className={`text-sm font-semibold ${row.color || 'text-zinc-900'}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const count =
                tab.id === 'weak' ? weakTopics.length :
                tab.id === 'strong' ? strongTopics.length :
                tab.id === 'history' ? recentAttempts.length :
                chapterAnalysis.length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap py-3.5 px-3 text-sm font-medium transition sm:px-4 ${
                    activeTab === tab.id
                      ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-indigo-600'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Chapter Analysis */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {chapterAnalysis.length === 0 ? (
                <div className="py-12 text-center">
                  <BarChart3 className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-500">No chapter data yet.</p>
                  <Link href="/user/quiz" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    Start a quiz
                  </Link>
                </div>
              ) : (
                chapterAnalysis.map((chapter) => (
                  <div key={chapter.id} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                          <BookOpen className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">{chapter.title}</h4>
                          <p className="text-xs text-zinc-500">{chapter.level.replace('_', ' ')} · {chapter.totalAttempts} attempts · {chapter.correctAnswers}/{chapter.totalQuestions} correct</p>
                        </div>
                      </div>
                      <span className={`text-xl font-bold ${
                        chapter.accuracy >= 70 ? 'text-emerald-600' :
                        chapter.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {chapter.accuracy}%
                      </span>
                    </div>
                    {chapter.subtopics.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        {chapter.subtopics.map((st) => (
                          <div key={st.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {st.isWeak ? (
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              ) : st.accuracy >= 70 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              ) : (
                                <div className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="truncate text-sm text-zinc-700">{st.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-zinc-400">{st.totalQuestions}q</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                st.accuracy >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                st.accuracy >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {st.accuracy}%
                              </span>
                              <Link
                                href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                              >
                                Quiz
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Weak topics */}
          {activeTab === 'weak' && (
            <div>
              {weakTopics.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingUp className="mx-auto mb-3 h-10 w-10 text-emerald-200" />
                  <p className="text-sm font-medium text-zinc-600">No weak topics found.</p>
                  <p className="mt-1 text-xs text-zinc-400">Keep practicing to maintain your performance!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                    {weakTopics.length} topic{weakTopics.length !== 1 ? 's' : ''} need attention
                  </div>
                  {weakTopics.map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{topic.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{topic.chapterTitle} · {topic.level.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-rose-600">{topic.accuracy}%</p>
                          <p className="text-xs text-zinc-400">{topic.correctAnswers}/{topic.totalQuestions}</p>
                        </div>
                        <Link
                          href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`}
                          className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          Practice
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Strong topics */}
          {activeTab === 'strong' && (
            <div>
              {strongTopics.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingDown className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-500">Keep practicing to build strong topics!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {strongTopics.length} strong topic{strongTopics.length !== 1 ? 's' : ''}
                  </div>
                  {strongTopics.map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{topic.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{topic.chapterTitle} · {topic.level.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">{topic.accuracy}%</p>
                          <p className="text-xs text-zinc-400">{topic.correctAnswers}/{topic.totalQuestions}</p>
                        </div>
                        <Link
                          href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`}
                          className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Keep sharp
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div>
              {recentAttempts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500">No quiz attempts yet.</p>
                  <Link href="/user/quiz" className="mt-4 inline-flex rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    Start your first quiz
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={attempt.score} />
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {attempt.mode.replace(/_/g, ' ')} · {attempt.level.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {attempt.correctCount}/{attempt.totalQuestions} correct
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
