"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Flag, AlertTriangle, CircleX, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';

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
};

type ApiResponse<T> = { success: boolean; data?: T; error?: { message?: string } };

const levelOptions: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

function extractText(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof input !== 'object') return '';
  const node = input as { text?: string; content?: unknown[]; html?: string };
  const html = typeof node.html === 'string' ? node.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const text = typeof node.text === 'string' ? node.text : html;
  const children = Array.isArray(node.content) ? node.content.map(extractText).filter(Boolean).join(' ') : '';
  return `${text} ${children}`.trim();
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLevel = params.get('level');
    const urlMode = params.get('mode');
    const urlChapter = params.get('chapter');
    const urlSubtopic = params.get('subtopic');
    if (urlLevel && (['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as string[]).includes(urlLevel)) setLevel(urlLevel as Level);
    if (urlMode && (['SUBTOPIC', 'CHAPTER', 'CUSTOM', 'FULL_TEST'] as string[]).includes(urlMode)) setMode(urlMode as QuizMode);
    if (urlChapter) setSelectedChapterId(urlChapter);
    if (urlSubtopic) setSelectedSubtopicId(urlSubtopic);
  }, []);

  const currentItem = useMemo(() => attempt?.items[currentIndex] ?? null, [attempt, currentIndex]);
  const currentQuestion = currentItem?.questionSnapshotJson ?? null;

  useEffect(() => { setReportReason(''); setReportOpen(false); }, [currentItem?.questionId]);

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

  const score = attempt ? Math.round(attempt.scorePercentage ?? 0) : 0;
  const isLastQuestion = attempt ? currentIndex >= attempt.items.length - 1 : false;

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
                  <select value={level} onChange={e => setLevel(e.target.value as Level)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {levelOptions.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                  </select>
                )},
                { label: 'Mode', field: (
                  <select value={mode} onChange={e => setMode(e.target.value as QuizMode)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="SUBTOPIC">Subtopic</option>
                    <option value="CHAPTER">Chapter</option>
                    <option value="CUSTOM">Custom</option>
                    <option value="FULL_TEST">Full test</option>
                  </select>
                )},
                { label: 'Questions', field: (
                  <input type="number" min={5} max={100} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                )},
              ].map(({ label, field }) => (
                <div key={label}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
                  {field}
                </div>
              ))}
            </div>

            {(mode === 'CHAPTER' || mode === 'SUBTOPIC' || mode === 'CUSTOM') && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Chapter</label>
                <select value={selectedChapterId} onChange={e => setSelectedChapterId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  {chapters.length === 0 && <option value="">No published chapters</option>}
                  {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}

            {mode === 'SUBTOPIC' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtopic</label>
                <select value={selectedSubtopicId} onChange={e => setSelectedSubtopicId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
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
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {s.title}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {errorMessage && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>}

            <button type="button" onClick={() => void handleStartQuiz()} disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
              {isLoading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
                : 'Start quiz'}
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
            onClick={() => { setAttempt(null); setCurrentIndex(0); setIsCompleted(false); }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
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
              <p className="mt-2 text-sm leading-6 text-zinc-900">
                {extractText(item.questionSnapshotJson.promptJson) || 'Question unavailable'}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-zinc-600"><span className="font-medium text-zinc-800">Your answer:</span> {getOptionText(item, item.selectedOptionId)}</p>
                {item.questionSnapshotJson.explanationJson && (
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Explanation</p>
                    <p className="text-sm text-zinc-700">{extractText(item.questionSnapshotJson.explanationJson) || 'No explanation.'}</p>
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
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="shrink-0 font-semibold text-zinc-700">Q{currentIndex + 1} / {attempt.items.length}</span>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${((currentIndex + 1) / attempt.items.length) * 100}%` }} />
          </div>
        </div>
        <span className="shrink-0">{answered} answered{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}</span>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <div className="p-5 sm:p-7">
          <div className="mb-5 rounded-xl bg-zinc-50 p-4 sm:p-5">
            <p className="text-base leading-7 text-zinc-900">
              {extractText(currentQuestion?.promptJson) || 'Question unavailable'}
            </p>
          </div>

          <div className="space-y-2.5">
            {currentQuestion?.options.map((opt, idx) => {
              const selected = currentItem?.selectedOptionId === opt.id;
              return (
                <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50'}`}>
                  <input type="radio" name={`q-${currentQuestion.id}`} checked={selected} onChange={() => updateCurrentSelection(opt.id)} className="sr-only" />
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                    {letters[idx] ?? idx + 1}
                  </div>
                  <span className="text-sm leading-6 text-zinc-800">{extractText(opt.contentJson) || 'Option'}</span>
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
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              {isSubmittingAnswer
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
                : isLastQuestion ? 'Submit' : 'Next'}
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
                className="mt-3 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={() => void handleReport()} disabled={!reportReason.trim() || isReporting}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-zinc-700">
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
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-1' : ''} ${
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
    </div>
  );
}
