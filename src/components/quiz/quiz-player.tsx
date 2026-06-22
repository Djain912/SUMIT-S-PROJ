"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Flag, AlertTriangle, CircleX, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { sanitizeHtml, escapeHtml } from '@/lib/security/sanitize';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
type QuizMode = 'SUBTOPIC' | 'CHAPTER' | 'CUSTOM' | 'FULL_TEST';

type Chapter = { id: string; level: Level; title: string; slug: string; orderIndex: number };
type Subtopic = { id: string; chapterId: string; title: string; slug: string; orderIndex: number };

type QuestionOptionSnapshot = { id: string; contentJson: Record<string, unknown>; orderIndex: number };
type QuestionSnapshot = {
  id: string;
  promptJson: Record<string, unknown>;
  explanationJson: Record<string, unknown> | null;
  options: QuestionOptionSnapshot[];
};

type AttemptItem = {
  id: string;
  questionId: string;
  questionOrder: number;
  questionSnapshotJson: QuestionSnapshot;
  selectedOptionId: string | null;
  selectedOptionSnapshotJson: { id: string; isCorrect: boolean } | null;
  isCorrect: boolean;
  flagColor?: 'YELLOW' | 'RED' | null;
  flaggedAt?: string | null;
};

type QuizAttempt = {
  id: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number | null;
  items: AttemptItem[];
  selectionJson?: { timeLimitMinutes?: number; mode?: string } | null;
};

// Official CMT Level I exam format — shown on the Full Length Test setup screen.
const FULL_TEST_QUESTIONS = 132;
const FULL_TEST_MINUTES = 120;
const CMT_DOMAINS = [
  { label: 'Theory & History', pct: 38 },
  { label: 'Classical Techniques', pct: 33 },
  { label: 'Advanced Techniques', pct: 26 },
  { label: 'Ethics', pct: 3 },
];

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

type ApiResponse<T> = { success: boolean; data?: T; error?: { message?: string } };

const levelOptions: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];
const lockedLevels: Level[] = ['LEVEL_2', 'LEVEL_3'];

function tiptapToHtml(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; marks?: { type: string }[]; content?: unknown[]; attrs?: Record<string, unknown> };
  if (n.type === 'text') {
    let text = (n.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    for (const m of n.marks ?? []) {
      if (m.type === 'bold') text = `<strong>${text}</strong>`;
      else if (m.type === 'italic') text = `<em>${text}</em>`;
      else if (m.type === 'underline') text = `<u>${text}</u>`;
      else if (m.type === 'code') text = `<code>${text}</code>`;
    }
    return text;
  }
  if (n.type === 'image') {
    // Escape attribute values so a crafted src/alt cannot break out of the
    // attribute and inject markup (e.g. src='x" onerror="alert(1)').
    const src = escapeHtml(String(n.attrs?.src ?? ''));
    const alt = escapeHtml(String(n.attrs?.alt ?? ''));
    return `<img src="${src}" alt="${alt}" class="max-w-full rounded-lg my-2" />`;
  }
  const inner = (n.content ?? []).map(tiptapToHtml).join('');
  switch (n.type) {
    case 'doc': return inner;
    case 'paragraph': return `<p>${inner || '<br>'}</p>`;
    case 'hardBreak': return '<br>';
    case 'bulletList': return `<ul>${inner}</ul>`;
    case 'orderedList': return `<ol>${inner}</ol>`;
    case 'listItem': return `<li>${inner}</li>`;
    case 'blockquote': return `<blockquote>${inner}</blockquote>`;
    case 'codeBlock': return `<pre><code>${inner}</code></pre>`;
    case 'heading': return `<h${n.attrs?.level ?? 2}>${inner}</h${n.attrs?.level ?? 2}>`;
    default: return inner;
  }
}

function richJsonToHtml(input: unknown): string {
  // Always run the result through DOMPurify: the `obj.html` and raw-string
  // branches carry author-supplied HTML that would otherwise be injected
  // verbatim into the page.
  return sanitizeHtml(richJsonToHtmlRaw(input));
}

function richJsonToHtmlRaw(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (typeof input !== 'object') return '';
  const obj = input as { html?: string; type?: string };
  if (typeof obj.html === 'string') return obj.html;
  if (obj.type === 'doc') return tiptapToHtml(input);
  return '';
}

function extractText(input: unknown): string {
  return richJsonToHtml(input).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.success) throw new Error(payload.error?.message ?? 'Request failed');
  return payload.data as T;
}

export function QuizPlayer() {
  const [level, setLevel] = useState<Level>('LEVEL_1');
  const [mode, setMode] = useState<QuizMode>('SUBTOPIC');
  const [questionCount, setQuestionCount] = useState(10);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('');
  const [selectedCustomSubtopicIds, setSelectedCustomSubtopicIds] = useState<string[]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const finishRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLevel = params.get('level');
    const urlMode = params.get('mode');
    const urlChapter = params.get('chapter');
    const urlSubtopic = params.get('subtopic');
    if (urlLevel && (['LEVEL_1'] as string[]).includes(urlLevel)) setLevel(urlLevel as Level);
    if (urlMode && (['SUBTOPIC', 'CHAPTER', 'CUSTOM', 'FULL_TEST'] as string[]).includes(urlMode)) setMode(urlMode as QuizMode);
    if (urlChapter) setSelectedChapterId(urlChapter);
    if (urlSubtopic) setSelectedSubtopicId(urlSubtopic);
  }, []);

  const currentItem = useMemo(() => attempt?.items[currentIndex] ?? null, [attempt, currentIndex]);
  const currentQuestion = currentItem?.questionSnapshotJson ?? null;

  useEffect(() => { setReportReason(''); setReportOpen(false); }, [currentItem?.questionId]);

  // Countdown for timed mock tests — ticks every second and auto-submits at 0.
  useEffect(() => {
    if (!deadline || isCompleted) return;
    const id = setInterval(() => {
      const left = Math.round((deadline - Date.now()) / 1000);
      setTimeLeft(left > 0 ? left : 0);
      if (left <= 0) {
        clearInterval(id);
        void finishRef.current?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, isCompleted]);

  const loadChapters = useCallback(async (lvl: Level) => {
    try {
      const data = await apiJson<Chapter[]>(`/api/chapters?level=${lvl}`);
      setChapters(data);
      setSelectedChapterId(data[0]?.id ?? '');
      setSubtopics([]);
      setSelectedSubtopicId('');
      setSelectedCustomSubtopicIds([]);
    } catch { /* silent */ }
  }, []);

  const loadSubtopics = useCallback(async (chapterId: string) => {
    if (!chapterId) { setSubtopics([]); setSelectedSubtopicId(''); return; }
    try {
      const data = await apiJson<Subtopic[]>(`/api/chapters/${chapterId}/subtopics`);
      setSubtopics(data);
      setSelectedSubtopicId(data[0]?.id ?? '');
      setSelectedCustomSubtopicIds(prev => prev.filter(id => data.some(s => s.id === id)));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void loadChapters(level); }, [level, loadChapters]);
  useEffect(() => { void loadSubtopics(selectedChapterId); }, [selectedChapterId, loadSubtopics]);

  async function handleStartQuiz() {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const payload = {
        mode, level,
        selectedChapterIds: mode === 'CHAPTER' && selectedChapterId ? [selectedChapterId] : [],
        selectedSubtopicIds:
          mode === 'SUBTOPIC' && selectedSubtopicId ? [selectedSubtopicId] :
          mode === 'CUSTOM' ? selectedCustomSubtopicIds : [],
        questionCount,
        randomizeOrder: true,
      };
      const started = await apiJson<QuizAttempt>('/api/quizzes/start', { method: 'POST', body: JSON.stringify(payload) });
      if (!started.items?.length) throw new Error('No questions available for the selected criteria.');
      setAttempt(started);
      setCurrentIndex(0);
      setIsCompleted(false);
      setQuestionStartedAt(Date.now());
      // Timed mock test: arm the countdown from the server-set limit.
      const limitMin = started.selectionJson?.timeLimitMinutes ?? null;
      if (limitMin) {
        setDeadline(Date.now() + limitMin * 60_000);
        setTimeLeft(limitMin * 60);
      } else {
        setDeadline(null);
        setTimeLeft(null);
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to start quiz');
    } finally {
      setIsLoading(false);
    }
  }

  function updateCurrentSelection(optionId: string) {
    setAttempt(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[currentIndex] = { ...items[currentIndex], selectedOptionId: optionId };
      return { ...prev, items };
    });
  }

  async function persistAnswer(item: AttemptItem) {
    if (!attempt || !item.selectedOptionId) return;
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
    const updated = await apiJson<AttemptItem>(`/api/quizzes/${attempt.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId: item.questionId, selectedOptionId: item.selectedOptionId, timeSpentSeconds }),
    });
    setAttempt(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) items[idx] = { ...items[idx], ...updated };
      return { ...prev, items };
    });
  }

  async function handleNext() {
    if (!attempt || !currentItem) return;
    setIsSubmittingAnswer(true);
    setErrorMessage('');
    try {
      await persistAnswer(currentItem);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to save answer');
      setIsSubmittingAnswer(false);
      return;
    }
    if (currentIndex >= attempt.items.length - 1) {
      try {
        const completed = await apiJson<QuizAttempt>(`/api/quizzes/${attempt.id}/complete`, { method: 'POST' });
        setAttempt(completed);
        setIsCompleted(true);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Unable to complete quiz');
      } finally {
        setIsSubmittingAnswer(false);
      }
      return;
    }
    setCurrentIndex(i => i + 1);
    setQuestionStartedAt(Date.now());
    setIsSubmittingAnswer(false);
  }

  async function handleFlag(flagColor: 'YELLOW' | 'RED' | null) {
    if (!attempt || !currentItem) return;
    setIsFlagging(true);
    try {
      const updated = await apiJson<AttemptItem>(`/api/quizzes/${attempt.id}/items/${currentItem.id}/flag`, {
        method: 'PATCH', body: JSON.stringify({ flagColor }),
      });
      setAttempt(prev => {
        if (!prev) return prev;
        const items = [...prev.items];
        items[currentIndex] = { ...items[currentIndex], flagColor: updated.flagColor, flaggedAt: updated.flaggedAt };
        return { ...prev, items };
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to flag question');
    } finally {
      setIsFlagging(false);
    }
  }

  async function handleReport() {
    if (!currentQuestion || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      await apiJson(`/api/user/questions/${currentQuestion.id}/report`, {
        method: 'POST', body: JSON.stringify({ reason: reportReason.trim() }),
      });
      setReportReason('');
      setReportOpen(false);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to report question');
    } finally {
      setIsReporting(false);
    }
  }

  async function jumpTo(index: number) {
    if (!attempt || !currentItem || index === currentIndex) return;
    setIsSubmittingAnswer(true);
    try { await persistAnswer(currentItem); } catch { /* silent */ }
    setCurrentIndex(index);
    setQuestionStartedAt(Date.now());
    setIsSubmittingAnswer(false);
    setNavOpen(false);
  }

  function getOptionText(item: AttemptItem, optionId: string | null) {
    if (!optionId) return 'Not answered';
    const opt = item.questionSnapshotJson.options.find(o => o.id === optionId);
    return opt ? extractText(opt.contentJson) || 'Answer unavailable' : 'Answer unavailable';
  }

  // Latest completion routine, kept in a ref so the 1-second timer can call it
  // without re-arming the interval (and without stale closures).
  finishRef.current = async () => {
    if (!attempt || isCompleted) return;
    setIsSubmittingAnswer(true);
    setErrorMessage('');
    try {
      if (currentItem?.selectedOptionId) {
        try { await persistAnswer(currentItem); } catch { /* keep going to submit */ }
      }
      const completed = await apiJson<QuizAttempt>(`/api/quizzes/${attempt.id}/complete`, { method: 'POST' });
      setAttempt(completed);
      setIsCompleted(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to submit test');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const score = attempt ? Math.round(attempt.scorePercentage ?? 0) : 0;
  const isLastQuestion = attempt ? currentIndex >= attempt.items.length - 1 : false;
  const isTimedOut = timeLeft !== null && timeLeft <= 0;

  /* ── SETUP ── */
  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Practice</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Quiz</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure your session and start practicing.</p>

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Level', field: (
                  <select value={level} onChange={e => { const v = e.target.value as Level; if (!lockedLevels.includes(v)) setLevel(v); }} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                    {levelOptions.map(l => <option key={l} value={l} disabled={lockedLevels.includes(l)}>{l.replace('_', ' ')}{lockedLevels.includes(l) ? ' — Coming Soon' : ''}</option>)}
                  </select>
                )},
                { label: 'Mode', field: (
                  <select value={mode} onChange={e => setMode(e.target.value as QuizMode)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                    <option value="SUBTOPIC">Subtopic</option>
                    <option value="CHAPTER">Chapter</option>
                    <option value="CUSTOM">Custom</option>
                    <option value="FULL_TEST">Full Length Test</option>
                  </select>
                )},
                // The full mock test is a fixed 132-question paper — no manual count.
                ...(mode === 'FULL_TEST' ? [] : [{ label: 'Questions', field: (
                  <input type="number" min={5} max={100} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                )}]),
              ].map(({ label, field }) => (
                <div key={label}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
                  {field}
                </div>
              ))}
            </div>

            {mode === 'FULL_TEST' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  <p className="text-sm font-semibold text-emerald-900">Official CMT Level I exam format</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-700">
                  <span><strong>{FULL_TEST_QUESTIONS}</strong> questions</span>
                  <span><strong>{Math.round(FULL_TEST_MINUTES / 60)} hours</strong> ({FULL_TEST_MINUTES} min)</span>
                  <span>Auto-submits when time runs out</span>
                </div>
                <p className="mt-3 mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Questions weighted by knowledge domain</p>
                <div className="space-y-1.5">
                  {CMT_DOMAINS.map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="w-40 shrink-0 text-xs text-zinc-600">{d.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-700">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(mode === 'CHAPTER' || mode === 'SUBTOPIC' || mode === 'CUSTOM') && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Chapter</label>
                <select value={selectedChapterId} onChange={e => setSelectedChapterId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                  {chapters.length === 0 && <option value="">No published chapters</option>}
                  {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}

            {mode === 'SUBTOPIC' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtopic</label>
                <select value={selectedSubtopicId} onChange={e => setSelectedSubtopicId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                  {subtopics.length === 0 && <option value="">No published subtopics</option>}
                  {subtopics.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}

            {mode === 'CUSTOM' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Subtopics ({selectedCustomSubtopicIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                  {subtopics.length === 0 && <p className="text-sm text-zinc-400">No subtopics available.</p>}
                  {subtopics.map(s => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
                      <input type="checkbox" checked={selectedCustomSubtopicIds.includes(s.id)}
                        onChange={e => setSelectedCustomSubtopicIds(prev => e.target.checked ? [...new Set([...prev, s.id])] : prev.filter(id => id !== s.id))}
                        className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 focus:ring-zinc-400"
                      />
                      {s.title}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {errorMessage && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>}

            <button type="button" onClick={() => void handleStartQuiz()} disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60">
              {isLoading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
                : mode === 'FULL_TEST' ? 'Start full length test' : 'Start quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (isCompleted) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm text-center">
          <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ${score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}>
            {score}%
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Quiz complete</h2>
          <p className="mt-1 text-sm text-zinc-500">{attempt.correctCount} of {attempt.totalQuestions} correct</p>
          <button type="button"
            onClick={() => { setAttempt(null); setCurrentIndex(0); setIsCompleted(false); setDeadline(null); setTimeLeft(null); }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
            New quiz
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Review</h3>
          {attempt.items.map((item, i) => (
            <div key={item.id} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-zinc-400">Q{i + 1}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {item.isCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>
              <div className="mt-2 prose prose-sm w-full max-w-none break-words text-sm leading-6 text-zinc-900" dangerouslySetInnerHTML={{ __html: richJsonToHtml(item.questionSnapshotJson.promptJson) || 'Question unavailable' }} />
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-zinc-600"><span className="font-medium text-zinc-800">Your answer:</span> {getOptionText(item, item.selectedOptionId)}</p>
                {item.questionSnapshotJson.explanationJson && (
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Explanation</p>
                    <div className="prose prose-sm w-full max-w-none break-words text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: richJsonToHtml(item.questionSnapshotJson.explanationJson) || 'No explanation.' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── ACTIVE QUIZ ── */
  const answered = attempt.items.filter(i => i.selectedOptionId).length;
  const flaggedCount = attempt.items.filter(i => i.flagColor).length;
  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Countdown (timed mock tests only) */}
      {timeLeft !== null && (
        <div className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold tabular-nums ${
          timeLeft <= 300 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
          <Clock className="h-4 w-4" />
          {isTimedOut ? 'Time up — submitting…' : `Time remaining: ${formatClock(timeLeft)}`}
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="shrink-0 font-semibold text-zinc-700">Q{currentIndex + 1} / {attempt.items.length}</span>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${((currentIndex + 1) / attempt.items.length) * 100}%` }} />
          </div>
        </div>
        <span className="shrink-0">{answered} answered{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}</span>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <div className="p-5 sm:p-7">
          <div className="mb-5 rounded-xl bg-zinc-50 p-4 sm:p-5">
            <div className="prose prose-sm w-full max-w-none break-words text-base leading-7 text-zinc-900" dangerouslySetInnerHTML={{ __html: richJsonToHtml(currentQuestion?.promptJson) || 'Question unavailable' }} />
          </div>

          <div className="space-y-2.5">
            {currentQuestion?.options.map((opt, idx) => {
              const selected = currentItem?.selectedOptionId === opt.id;
              return (
                <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-zinc-100 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}>
                  <input type="radio" name={`q-${currentQuestion.id}`} checked={selected} onChange={() => updateCurrentSelection(opt.id)} className="sr-only" />
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-emerald-700 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                    {letters[idx] ?? idx + 1}
                  </div>
                  <div className="prose prose-sm w-full max-w-none break-words text-sm leading-6 text-zinc-800" dangerouslySetInnerHTML={{ __html: richJsonToHtml(opt.contentJson) || 'Option' }} />
                </label>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentIndex === 0 || isSubmittingAnswer} onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40">
              Prev
            </button>
            <button type="button" onClick={() => void handleNext()} disabled={isSubmittingAnswer}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60">
              {isSubmittingAnswer
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
                : isLastQuestion ? 'Submit' : 'Next'}
            </button>
            {/* Submit/finish at any point — confirms if questions are still pending */}
            <button type="button" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmittingAnswer}
              className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40">
              Submit test
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => void handleFlag('YELLOW')} disabled={isFlagging} title="Flag for review"
              className={`rounded-full border p-2 text-xs transition ${currentItem?.flagColor === 'YELLOW' ? 'border-amber-400 bg-amber-100 text-amber-800' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => void handleFlag('RED')} disabled={isFlagging} title="Flag as wrong"
              className={`rounded-full border p-2 text-xs transition ${currentItem?.flagColor === 'RED' ? 'border-rose-400 bg-rose-100 text-rose-800' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'}`}>
              <CircleX className="h-3.5 w-3.5" />
            </button>
            {currentItem?.flagColor && (
              <button type="button" onClick={() => void handleFlag(null)} disabled={isFlagging} title="Clear flag"
                className="rounded-full border border-zinc-200 p-2 text-zinc-400 hover:bg-zinc-50">
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible report */}
        <div className="border-t border-zinc-100">
          <button type="button" onClick={() => setReportOpen(o => !o)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition">
            <span>Report an issue</span>
            {reportOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {reportOpen && (
            <div className="border-t border-zinc-50 px-5 pb-5">
              <textarea value={reportReason} onChange={e => setReportReason(e.target.value)}
                placeholder="Describe the issue (max 500 characters)" maxLength={500} rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={() => void handleReport()} disabled={!reportReason.trim() || isReporting}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-600">
                  {isReporting ? 'Submitting…' : 'Submit report'}
                </button>
                <button type="button" onClick={() => { setReportReason(''); setReportOpen(false); }}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>}

      {/* Question navigator */}
      <div>
        <button type="button" onClick={() => setNavOpen(o => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium text-zinc-500 shadow-sm transition hover:bg-zinc-50 sm:hidden">
          <span>Navigator ({answered}/{attempt.items.length})</span>
          {navOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className={`${navOpen ? 'block' : 'hidden sm:block'} mt-2 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm`}>
          <div className="flex flex-wrap gap-1.5">
            {attempt.items.map((item, idx) => {
              const isCurrent = currentIndex === idx;
              const isAnswered = Boolean(item.selectedOptionId);
              return (
                <button key={item.id} type="button" onClick={() => void jumpTo(idx)} disabled={isSubmittingAnswer}
                  title={`Q${idx + 1}${isAnswered ? ' · Answered' : ''}${item.flagColor ? ` · ${item.flagColor}` : ''}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition ${isCurrent ? 'ring-2 ring-emerald-700 ring-offset-1' : ''} ${
                    item.flagColor === 'YELLOW' ? 'bg-amber-400 text-zinc-900' :
                    item.flagColor === 'RED' ? 'bg-rose-500 text-white' :
                    isAnswered ? 'bg-emerald-100 text-emerald-800' :
                    'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100 inline-block" /> Answered</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-zinc-100 inline-block" /> Unanswered</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400 inline-block" /> Review</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500 inline-block" /> Flagged</span>
          </div>
        </div>
      </div>

      {/* Submit confirmation — warns about pending questions before finishing */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-900">Submit your test?</h3>
            {answered < attempt.items.length ? (
              <p className="mt-2 text-sm text-zinc-600">
                You still have <strong className="text-rose-600">{attempt.items.length - answered} unanswered question{attempt.items.length - answered !== 1 ? 's' : ''}</strong>. They&apos;ll be marked as not answered and you won&apos;t be able to change them.
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">You&apos;ve answered all questions. Once submitted, you can&apos;t change your answers.</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSubmitConfirm(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50">
                Keep going
              </button>
              <button type="button"
                onClick={() => { setShowSubmitConfirm(false); void finishRef.current?.(); }}
                disabled={isSubmittingAnswer}
                className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60">
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
