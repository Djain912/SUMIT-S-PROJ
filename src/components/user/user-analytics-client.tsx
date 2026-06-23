'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Target, Clock, Zap, Award, AlertTriangle, CheckCircle2,
  BookOpen, BarChart3, TrendingUp, TrendingDown, ArrowRight,
  Flame, ListChecks, Layers, Sparkles, Send, Loader2,
} from 'lucide-react';

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
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? 'Failed to load analytics');
  return payload.data!;
}

function fetchAnalyticsInFlight(): Promise<AnalyticsData> {
  if (analyticsInFlight.size > 0) return Array.from(analyticsInFlight)[0];
  const request = fetchAnalytics();
  analyticsInFlight.add(request);
  request.finally(() => analyticsInFlight.clear());
  return request;
}

function scoreColor(v: number) {
  if (v >= 70) return 'text-emerald-600';
  if (v >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

function barColor(v: number) {
  if (v >= 70) return 'bg-emerald-500';
  if (v >= 50) return 'bg-amber-400';
  return 'bg-rose-500';
}

function badgeClass(v: number) {
  if (v >= 70) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (v >= 50) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
}

function AccuracyBar({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <div className="flex items-center gap-2">
          {sub && <span className="text-xs text-zinc-400">{sub}</span>}
          <span className={`text-sm font-bold tabular-nums ${scoreColor(value)}`}>{value}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const tabs = [
  { id: 'overview', label: 'Chapters', icon: Layers },
  { id: 'weak', label: 'Needs Work', icon: AlertTriangle },
  { id: 'strong', label: 'Strong', icon: CheckCircle2 },
  { id: 'history', label: 'History', icon: ListChecks },
] as const;

type Tab = typeof tabs[number]['id'];

// ── AI Coach: summary + study plan ───────────────────────────────────────────
interface CoachData {
  headline: string;
  summary: string;
  focusTopic: { title: string; reason: string } | null;
  plan: { step: string; detail: string }[];
  encouragement: string;
}

function AICoachCard({ hasData }: { hasData: boolean }) {
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user/analytics/coach');
        const payload = await res.json();
        if (active && payload.success) setCoach(payload.data as CoachData);
      } catch {
        /* coaching is non-critical — silently skip on failure */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-emerald-900">Your AI Study Coach</h3>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-2/3 rounded bg-emerald-100" />
          <div className="h-4 w-full rounded bg-emerald-50" />
          <div className="h-4 w-5/6 rounded bg-emerald-50" />
        </div>
      ) : !coach ? (
        <p className="text-sm text-zinc-500">Your coach is unavailable right now. Please try again later.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-base font-bold text-zinc-900">{coach.headline}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{coach.summary}</p>
          </div>

          {coach.focusTopic && (
            <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Focus next</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{coach.focusTopic.title}</p>
              <p className="text-xs text-zinc-500">{coach.focusTopic.reason}</p>
            </div>
          )}

          {coach.plan.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Your plan</p>
              <ol className="space-y-2">
                {coach.plan.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{p.step}</p>
                      <p className="text-xs text-zinc-500">{p.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {coach.encouragement && (
            <p className="text-sm italic text-emerald-800">{coach.encouragement}</p>
          )}
        </div>
      )}

      {hasData && <CoachChat />}
    </div>
  );
}

// ── Ask-your-data chat ───────────────────────────────────────────────────────
type ChatMsg = { role: 'user' | 'assistant'; content: string };

const COACH_SUGGESTIONS = [
  'Where am I losing the most marks?',
  'What should I study next?',
  'Which chapter is my weakest?',
];

// Renders **bold** markdown inline without page-level side-effects
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const parts: React.ReactNode[] = [];
        const re = /\*\*([^*]+)\*\*/g;
        let last = 0, k = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          if (m.index > last) parts.push(line.slice(last, m.index));
          parts.push(<strong key={k++} className="font-semibold">{m[1]}</strong>);
          last = re.lastIndex;
        }
        if (last < line.length) parts.push(line.slice(last));
        return <span key={i}>{i > 0 && <br />}{parts}</span>;
      })}
    </>
  );
}

function CoachChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll only within the chat container — not the whole page
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = messages.slice(-6);
    setMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/user/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error?.message ?? 'Something went wrong.';
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: msg } : m));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snap = acc;
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snap } : m));
      }
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: 'Connection error. Please try again.' } : m));
    } finally {
      setBusy(false);
    }
  }, [busy, messages]);

  return (
    <div className="mt-5 border-t border-emerald-100 pt-4">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Ask about your performance</p>

      {messages.length > 0 && (
        <div ref={scrollRef} className="mb-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-emerald-700 text-white'
                  : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800'
              }`}>
                {m.content
                  ? <MarkdownText text={m.content} />
                  : busy
                    ? <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" /></span>
                    : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {COACH_SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-800 transition hover:bg-emerald-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
          placeholder="Ask your coach a question…"
          className="flex-1 bg-transparent text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!input.trim() || busy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function UserAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchAnalyticsInFlight());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-zinc-100 bg-white" />
          ))}
        </div>
        <div className="h-48 rounded-2xl border border-zinc-100 bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-zinc-200 bg-white">
        <p className="text-sm text-rose-600">{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  const { overallStats, levelSummaries, weakTopics, strongTopics, chapterAnalysis, recentAttempts } = data;

  const statCards = [
    {
      label: 'Accuracy',
      value: `${overallStats.overallAccuracy}%`,
      icon: Target,
      sub: `${overallStats.correctAnswers} / ${overallStats.totalQuestions} correct`,
      accent: 'bg-zinc-900',
    },
    {
      label: 'Avg. Score',
      value: `${overallStats.averageScore}%`,
      icon: Award,
      sub: `${overallStats.totalAttempts} quizzes taken`,
      accent: 'bg-zinc-800',
    },
    {
      label: 'Study Time',
      value: `${overallStats.totalTimeSpentMinutes}m`,
      icon: Clock,
      sub: 'Total time studied',
      accent: 'bg-zinc-700',
    },
    {
      label: 'Streak',
      value: `${overallStats.currentStreak}d`,
      icon: Flame,
      sub: `Best: ${overallStats.longestStreak} days`,
      accent: 'bg-zinc-600',
    },
  ];

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                </div>
                <span className="text-xs font-medium text-zinc-400">{card.label}</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-zinc-950 font-heading">{card.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* AI study coach — summary, plan, and ask-your-data chat */}
      <AICoachCard hasData={overallStats.totalAttempts > 0} />

      {/* Level performance + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Performance by Level</h3>
          </div>
          {levelSummaries.filter(l => l.totalAttempts > 0).length === 0 ? (
            <div className="py-8 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-zinc-200" />
              <p className="text-sm text-zinc-400">Take a quiz to see your level performance.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {levelSummaries.map((level) => (
                level.totalAttempts > 0 && (
                  <AccuracyBar
                    key={level.level}
                    value={level.accuracy}
                    label={level.level.replace('_', ' ')}
                    sub={`${level.totalAttempts} attempts · best ${level.bestScore}%`}
                  />
                )
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Summary</h3>
          </div>
          <dl className="space-y-3">
            {[
              { label: 'Total Quizzes', value: overallStats.totalAttempts },
              { label: 'Questions Done', value: overallStats.totalQuestions },
              { label: 'Correct Answers', value: overallStats.correctAnswers, highlight: true },
              { label: 'Longest Streak', value: `${overallStats.longestStreak}d` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                <dt className="text-xs text-zinc-500">{row.label}</dt>
                <dd className={`text-sm font-bold tabular-nums ${row.highlight ? 'text-emerald-600' : 'text-zinc-900'}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex border-b border-zinc-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === 'weak' ? weakTopics.length :
              tab.id === 'strong' ? strongTopics.length :
              tab.id === 'history' ? recentAttempts.length :
              chapterAnalysis.length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-xs font-semibold transition sm:gap-2 sm:text-sm ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">

          {/* Chapter Analysis */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {chapterAnalysis.length === 0 ? (
                <div className="py-14 text-center">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-500">No chapter data yet.</p>
                  <Link href="/user/quiz" className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
                    Start a quiz <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                chapterAnalysis.map((chapter) => (
                  <div key={chapter.id} className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
                    {/* Chapter header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{chapter.title}</p>
                          <p className="text-xs text-zinc-400">{chapter.totalAttempts} attempts · {chapter.correctAnswers}/{chapter.totalQuestions} correct</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-xl font-bold tabular-nums ${scoreColor(chapter.accuracy)}`}>
                        {chapter.accuracy}%
                      </span>
                    </div>
                    {/* Chapter progress bar */}
                    <div className="h-1.5 w-full bg-zinc-100">
                      <div className={`h-full transition-all duration-700 ${barColor(chapter.accuracy)}`} style={{ width: `${chapter.accuracy}%` }} />
                    </div>
                    {/* Subtopics */}
                    {chapter.subtopics.length > 0 && (
                      <div className="divide-y divide-zinc-50">
                        {chapter.subtopics.map((st) => (
                          <div key={st.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {st.isWeak ? (
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                              ) : st.accuracy >= 70 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              ) : (
                                <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-zinc-200" />
                              )}
                              <span className="truncate text-sm text-zinc-700">{st.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-zinc-400 tabular-nums">{st.totalQuestions}q</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(st.accuracy)}`}>
                                {st.accuracy}%
                              </span>
                              <Link href={`/user/quiz?mode=SUBTOPIC&subtopic=${st.id}`} className="inline-flex items-center gap-1 rounded-md border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 transition">
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

          {/* Needs Work */}
          {activeTab === 'weak' && (
            <div>
              {weakTopics.length === 0 ? (
                <div className="py-14 text-center">
                  <TrendingUp className="mx-auto mb-3 h-10 w-10 text-emerald-200" />
                  <p className="text-sm font-semibold text-zinc-700">No weak topics — great work!</p>
                  <p className="mt-1 text-xs text-zinc-400">Keep practicing to maintain your performance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {weakTopics.length} topic{weakTopics.length !== 1 ? 's' : ''} need attention
                  </div>
                  {weakTopics.map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{topic.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{topic.chapterTitle}</p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-rose-400 transition-all duration-500" style={{ width: `${topic.accuracy}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-xl font-bold tabular-nums ${scoreColor(topic.accuracy)}`}>{topic.accuracy}%</p>
                          <p className="text-xs text-zinc-400">{topic.correctAnswers}/{topic.totalQuestions}</p>
                        </div>
                        <Link href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700">
                          Practice <ArrowRight className="h-3 w-3" />
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
                <div className="py-14 text-center">
                  <TrendingDown className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-500">Keep practicing to build strong topics!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {strongTopics.length} strong topic{strongTopics.length !== 1 ? 's' : ''}
                  </div>
                  {strongTopics.map((topic) => (
                    <div key={topic.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{topic.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{topic.chapterTitle}</p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${topic.accuracy}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-xl font-bold tabular-nums ${scoreColor(topic.accuracy)}`}>{topic.accuracy}%</p>
                          <p className="text-xs text-zinc-400">{topic.correctAnswers}/{topic.totalQuestions}</p>
                        </div>
                        <Link href={`/user/quiz?mode=SUBTOPIC&subtopic=${topic.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">
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
                <div className="py-14 text-center">
                  <ListChecks className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-500">No quiz attempts yet.</p>
                  <Link href="/user/quiz" className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
                    Start your first quiz <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${badgeClass(attempt.score)}`}>
                          {attempt.score}%
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {attempt.mode.replace(/_/g, ' ')}
                            <span className="ml-1.5 text-xs font-normal text-zinc-400">{attempt.level.replace('_', ' ')}</span>
                          </p>
                          <p className="text-xs text-zinc-400">{attempt.correctCount}/{attempt.totalQuestions} correct</p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums">
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
