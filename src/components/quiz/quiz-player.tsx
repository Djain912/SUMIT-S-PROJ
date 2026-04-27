"use client";

import { useEffect, useMemo, useState } from 'react';
import { Flag, AlertTriangle, CircleX } from 'lucide-react';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
type QuizMode = 'SUBTOPIC' | 'CHAPTER' | 'CUSTOM' | 'FULL_TEST';

type Chapter = {
  id: string;
  level: Level;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
};

type Subtopic = {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
};

type QuestionOptionSnapshot = {
  id: string;
  contentJson: Record<string, unknown>;
  orderIndex: number;
};

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

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

const levelOptions: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

function extractTextFromRichJson(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return '';
  }

  const node = input as { text?: string; content?: unknown[] };
  const text = typeof node.text === 'string' ? node.text : '';
  const childText = Array.isArray(node.content)
    ? node.content.map((child) => extractTextFromRichJson(child)).filter(Boolean).join(' ')
    : '';

  return `${text} ${childText}`.trim();
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed');
  }

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const urlChapter = params.get('chapter');
    const urlSubtopic = params.get('subtopic');
    const urlLevel = params.get('level');

    if (urlLevel && ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(urlLevel)) {
      setLevel(urlLevel as Level);
    }
    if (urlMode && ['SUBTOPIC', 'CHAPTER', 'CUSTOM', 'FULL_TEST'].includes(urlMode)) {
      setMode(urlMode as QuizMode);
    }

    if (urlChapter) {
      setSelectedChapterId(urlChapter);
    }
    if (urlSubtopic) {
      setSelectedSubtopicId(urlSubtopic);
    }

    if ((urlChapter || urlSubtopic) && mode !== 'FULL_TEST') {
      const timer = setTimeout(() => {
        if (urlSubtopic && subtopics.length > 0) {
          const found = subtopics.find(st => st.id === urlSubtopic);
          if (found) {
            setSelectedSubtopicId(urlSubtopic);
            if (found.chapterId && !selectedChapterId) {
              setSelectedChapterId(found.chapterId);
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, subtopics, selectedChapterId]);

  const currentItem = useMemo(() => {
    if (!attempt) {
      return null;
    }

    return attempt.items[currentIndex] ?? null;
  }, [attempt, currentIndex]);

  const currentQuestion = currentItem?.questionSnapshotJson ?? null;

  useEffect(() => {
    setReportReason('');
  }, [currentItem?.questionId]);

  async function loadChapters(nextLevel: Level) {
    const data = await apiJson<Chapter[]>(`/api/chapters?level=${nextLevel}`);
    setChapters(data);

    if (data.length > 0) {
      setSelectedChapterId(data[0].id);
    } else {
      setSelectedChapterId('');
      setSubtopics([]);
      setSelectedSubtopicId('');
      setSelectedCustomSubtopicIds([]);
    }
  }

  async function loadSubtopics(chapterId: string) {
    if (!chapterId) {
      setSubtopics([]);
      setSelectedSubtopicId('');
      return;
    }

    const data = await apiJson<Subtopic[]>(`/api/chapters/${chapterId}/subtopics`);
    setSubtopics(data);
    if (data.length > 0) {
      setSelectedSubtopicId(data[0].id);
      setSelectedCustomSubtopicIds((current) => current.filter((id) => data.some((subtopic) => subtopic.id === id)));
    } else {
      setSelectedSubtopicId('');
      setSelectedCustomSubtopicIds([]);
    }
  }

  useEffect(() => {
    void loadChapters(level);
  }, [level]);

  useEffect(() => {
    void loadSubtopics(selectedChapterId);
  }, [selectedChapterId]);

async function handleStartQuiz() {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const payload = {
        mode,
        level,
        selectedChapterIds: mode === 'CHAPTER' && selectedChapterId ? [selectedChapterId] : [],
        selectedSubtopicIds:
          mode === 'SUBTOPIC' && selectedSubtopicId
            ? [selectedSubtopicId]
            : mode === 'CUSTOM'
            ? selectedCustomSubtopicIds
            : [],
        questionCount,
        randomizeOrder: true,
      };

      const startedAttempt = await apiJson<QuizAttempt>('/api/quizzes/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!startedAttempt.items || startedAttempt.items.length === 0) {
        throw new Error('No quiz questions available for the selected criteria.');
      }

      setAttempt(startedAttempt);
      setCurrentIndex(0);
      setIsCompleted(false);
      setQuestionStartedAt(Date.now());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start quiz');
    } finally {
      setIsLoading(false);
    }
  }

  function updateCurrentSelection(nextOptionId: string) {
    setAttempt((currentAttempt) => {
      if (!currentAttempt) {
        return currentAttempt;
      }

      const nextItems = [...currentAttempt.items];
      nextItems[currentIndex] = {
        ...nextItems[currentIndex],
        selectedOptionId: nextOptionId,
      };

      return {
        ...currentAttempt,
        items: nextItems,
      };
    });
  }

  async function persistAnswerForItem(item: AttemptItem) {
    if (!attempt || !item.selectedOptionId) {
      return;
    }

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
    const updatedItem = await apiJson<AttemptItem>(`/api/quizzes/${attempt.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: item.questionId,
        selectedOptionId: item.selectedOptionId,
        timeSpentSeconds,
      }),
    });

    setAttempt((currentAttempt) => {
      if (!currentAttempt) {
        return currentAttempt;
      }

      const targetIndex = currentAttempt.items.findIndex((entry) => entry.id === item.id);
      if (targetIndex < 0) {
        return currentAttempt;
      }

      const nextItems = [...currentAttempt.items];
      nextItems[targetIndex] = {
        ...nextItems[targetIndex],
        ...updatedItem,
      };

      return {
        ...currentAttempt,
        items: nextItems,
      };
    });
  }

  async function handleNextQuestion() {
    if (!attempt) {
      return;
    }

    if (!currentItem) {
      return;
    }

    setIsSubmittingAnswer(true);
    setErrorMessage('');

    try {
      await persistAnswerForItem(currentItem);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save answer');
      setIsSubmittingAnswer(false);
      return;
    }

    const isLastQuestion = currentIndex >= attempt.items.length - 1;

    if (isLastQuestion) {
      try {
        const completed = await apiJson<QuizAttempt>(`/api/quizzes/${attempt.id}/complete`, {
          method: 'POST',
        });

        setAttempt(completed);
        setIsCompleted(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to complete quiz');
      } finally {
        setIsSubmittingAnswer(false);
      }

      return;
    }

    setCurrentIndex((value) => value + 1);
    setQuestionStartedAt(Date.now());
    setIsSubmittingAnswer(false);
  }

  async function handleFlagQuestion(flagColor: 'YELLOW' | 'RED' | null) {
    if (!attempt || !currentItem) {
      return;
    }

    setIsFlagging(true);
    setErrorMessage('');

    try {
      const updatedItem = await apiJson<AttemptItem>(
        `/api/quizzes/${attempt.id}/items/${currentItem.id}/flag`,
        {
          method: 'PATCH',
          body: JSON.stringify({ flagColor }),
        }
      );

      setAttempt((currentAttempt) => {
        if (!currentAttempt) {
          return currentAttempt;
        }

        const nextItems = [...currentAttempt.items];
        nextItems[currentIndex] = {
          ...nextItems[currentIndex],
          flagColor: updatedItem.flagColor,
          flaggedAt: updatedItem.flaggedAt,
        };

        return {
          ...currentAttempt,
          items: nextItems,
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to flag question');
    } finally {
      setIsFlagging(false);
    }
  }

  async function handleReportQuestion() {
    if (!currentQuestion || !reportReason.trim()) {
      return;
    }

    setIsReporting(true);
    setErrorMessage('');

    try {
      await apiJson(`/api/user/questions/${currentQuestion.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason.trim() }),
      });

      alert('Question reported successfully');
      setReportReason('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to report question');
    } finally {
      setIsReporting(false);
    }
  }

  async function handleJumpToQuestion(index: number) {
    if (!attempt || !currentItem || index === currentIndex) {
      return;
    }

    setIsSubmittingAnswer(true);
    setErrorMessage('');

    try {
      await persistAnswerForItem(currentItem);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save answer');
      setIsSubmittingAnswer(false);
      return;
    }

    setCurrentIndex(index);
    setQuestionStartedAt(Date.now());
    setIsSubmittingAnswer(false);
  }

  function getOptionText(item: AttemptItem, optionId: string | null): string {
    if (!optionId) {
      return 'Not answered';
    }

    const option = item.questionSnapshotJson.options.find((entry) => entry.id === optionId);
    if (!option) {
      return 'Answer unavailable';
    }

    return extractTextFromRichJson(option.contentJson) || 'Answer unavailable';
  }

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm pb-24">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Quiz Practice</p>
        <h2 className="text-2xl font-semibold text-zinc-950">Take a level-based quiz</h2>
      </header>

      {!attempt ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Level</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as Level)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              >
                {levelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as QuizMode)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              >
                <option value="SUBTOPIC">Subtopic</option>
                <option value="CHAPTER">Chapter</option>
                <option value="CUSTOM">Custom</option>
                <option value="FULL_TEST">Full test</option>
              </select>
            </label>
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Question count</span>
              <input
                type="number"
                min={5}
                max={100}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
          </div>

          {(mode === 'CHAPTER' || mode === 'SUBTOPIC' || mode === 'CUSTOM') && (
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Chapter</span>
              <select
                value={selectedChapterId}
                onChange={(event) => setSelectedChapterId(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              >
                {chapters.length === 0 ? <option value="">No published chapters</option> : null}
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === 'SUBTOPIC' && (
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Subtopic</span>
              <select
                value={selectedSubtopicId}
                onChange={(event) => setSelectedSubtopicId(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              >
                {subtopics.length === 0 ? <option value="">No published subtopics</option> : null}
                {subtopics.map((subtopic) => (
                  <option key={subtopic.id} value={subtopic.id}>
                    {subtopic.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === 'CUSTOM' && (
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-700">Select multiple subtopics</p>
              {subtopics.length === 0 ? <p className="text-sm text-zinc-500">No published subtopics.</p> : null}
              {subtopics.map((subtopic) => {
                const checked = selectedCustomSubtopicIds.includes(subtopic.id);

                return (
                  <label key={subtopic.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedCustomSubtopicIds((current) => {
                          if (event.target.checked) {
                            return Array.from(new Set([...current, subtopic.id]));
                          }

                          return current.filter((id) => id !== subtopic.id);
                        });
                      }}
                    />
                    {subtopic.title}
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handleStartQuiz}
            disabled={isLoading}
            className="rounded-full bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? 'Starting...' : 'Start quiz'}
          </button>
        </div>
      ) : (
        <div className="space-y-5 pb-28">
          {isCompleted ? (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <h3 className="text-xl font-semibold text-zinc-950">Quiz completed</h3>
                <p className="text-sm text-zinc-700">
                  Score: {attempt.correctCount} / {attempt.totalQuestions} ({Math.round(attempt.scorePercentage ?? 0)}%)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAttempt(null);
                    setCurrentIndex(0);
                    setIsCompleted(false);
                  }}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm"
                >
                  Start another quiz
                </button>
              </div>

              <div className="space-y-4">
                {attempt.items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-700">Question {index + 1}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.isCorrect ? 'Correct' : 'Wrong'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-900">
                      {extractTextFromRichJson(item.questionSnapshotJson.promptJson) || 'Question text unavailable'}
                    </p>
                    <p className="mt-3 text-sm text-zinc-700">
                      <span className="font-medium">Your answer:</span> {getOptionText(item, item.selectedOptionId)}
                    </p>
                    <p className="mt-3 text-sm text-zinc-700">
                      <span className="font-medium">Explanation:</span>{' '}
                      {extractTextFromRichJson(item.questionSnapshotJson.explanationJson) || 'No explanation available.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                Question {currentIndex + 1} of {attempt.items.length}
              </p>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-base leading-7 text-zinc-900">
                  {extractTextFromRichJson(currentQuestion?.promptJson) || 'Question text unavailable'}
                </p>
              </div>

              <div className="space-y-3">
                {currentQuestion?.options.map((option) => {
                  const optionText = extractTextFromRichJson(option.contentJson) || 'Option';

                  return (
                    <label key={option.id} className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={currentItem?.selectedOptionId === option.id}
                        onChange={() => updateCurrentSelection(option.id)}
                      />
                      <span className="text-sm text-zinc-800">{optionText}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => void handleNextQuestion()}
                  disabled={isSubmittingAnswer}
                  className="rounded-full bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSubmittingAnswer
                    ? 'Saving...'
                    : currentIndex >= attempt.items.length - 1
                    ? 'Submit quiz'
                    : 'Save & next'}
                </button>

                <button
                  type="button"
                  disabled={currentIndex === 0 || isSubmittingAnswer}
                  onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-60"
                >
                  Previous
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleFlagQuestion('YELLOW')}
                    disabled={isFlagging}
                    title="Flag for review"
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      currentItem?.flagColor === 'YELLOW'
                        ? 'border-yellow-400 bg-yellow-100 text-yellow-900'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFlagQuestion('RED')}
                    disabled={isFlagging}
                    title="Flag as wrong"
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      currentItem?.flagColor === 'RED'
                        ? 'border-red-400 bg-red-100 text-red-900'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <CircleX className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFlagQuestion(null)}
                    disabled={isFlagging || !currentItem?.flagColor}
                    title="Clear flag"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 disabled:opacity-60 hover:bg-zinc-50"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="mb-3 text-sm font-medium text-orange-900">Report this question</p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe what is wrong in this question (max 500 characters)"
                  maxLength={500}
                  className="w-full rounded-lg border border-orange-300 p-2 text-sm resize-none"
                  rows={3}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleReportQuestion()}
                    disabled={!reportReason.trim() || isReporting}
                    className="rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-orange-700"
                  >
                    {isReporting ? 'Reporting...' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportReason('')}
                    className="rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
                  >
                    Clear text
                  </button>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-zinc-200 border-b-0 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="grid grid-cols-10 gap-1.5 md:grid-cols-12 md:gap-2">
                  {attempt.items.map((item, index) => {
                    const isCurrent = currentIndex === index;
                    const isAnswered = Boolean(item.selectedOptionId);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void handleJumpToQuestion(index)}
                        disabled={isSubmittingAnswer}
                        title={`Q${index + 1}${isAnswered ? ' - Answered' : ''}${item.flagColor ? ` - Flagged ${item.flagColor}` : ''}`}
                        className={`flex h-8 w-8 items-center justify-center rounded text-xs font-semibold transition ${
                          isCurrent ? 'ring-2 ring-zinc-950' : ''
                        } ${
                          item.flagColor === 'YELLOW'
                            ? 'bg-yellow-400 text-zinc-900'
                            : item.flagColor === 'RED'
                            ? 'bg-red-500 text-white'
                            : isAnswered
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </section>
  );
}
