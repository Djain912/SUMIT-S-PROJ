"use client";

import { useEffect, useMemo, useState } from 'react';

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
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState<{ isCorrect: boolean } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

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
  }, []);

  const currentItem = useMemo(() => {
    if (!attempt) {
      return null;
    }

    return attempt.items[currentIndex] ?? null;
  }, [attempt, currentIndex]);

  const currentQuestion = currentItem?.questionSnapshotJson ?? null;

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
      setSelectedOptionId('');
      setAnswerFeedback(null);
      setIsCompleted(false);
      setQuestionStartedAt(Date.now());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start quiz');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!attempt || !currentItem || !selectedOptionId) {
      return;
    }

    setIsSubmittingAnswer(true);
    setErrorMessage('');

    try {
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
      const updatedItem = await apiJson<AttemptItem>(`/api/quizzes/${attempt.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentItem.questionId,
          selectedOptionId,
          timeSpentSeconds,
        }),
      });

      setAttempt((currentAttempt) => {
        if (!currentAttempt) {
          return currentAttempt;
        }

        const nextItems = [...currentAttempt.items];
        nextItems[currentIndex] = {
          ...nextItems[currentIndex],
          ...updatedItem,
        };

        return {
          ...currentAttempt,
          items: nextItems,
        };
      });

      setAnswerFeedback({ isCorrect: updatedItem.isCorrect });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit answer');
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  async function handleNextQuestion() {
    if (!attempt) {
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
      }

      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelectedOptionId('');
    setAnswerFeedback(null);
    setQuestionStartedAt(Date.now());
  }

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
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
        <div className="space-y-5">
          {isCompleted ? (
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
                  setAnswerFeedback(null);
                  setSelectedOptionId('');
                  setIsCompleted(false);
                }}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm"
              >
                Start another quiz
              </button>
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
                        checked={selectedOptionId === option.id}
                        onChange={() => setSelectedOptionId(option.id)}
                      />
                      <span className="text-sm text-zinc-800">{optionText}</span>
                    </label>
                  );
                })}
              </div>

              {answerFeedback ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className={`text-sm font-medium ${answerFeedback.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                    {answerFeedback.isCorrect ? 'Correct answer.' : 'Incorrect answer.'}
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {extractTextFromRichJson(currentQuestion?.explanationJson) || 'No explanation available.'}
                  </p>
                </div>
              ) : null}

              <div className="flex gap-3">
                {!answerFeedback ? (
                  <button
                    type="button"
                    disabled={!selectedOptionId || isSubmittingAnswer}
                    onClick={handleSubmitAnswer}
                    className="rounded-full bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isSubmittingAnswer ? 'Submitting...' : 'Submit answer'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="rounded-full bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white"
                  >
                    {currentIndex >= attempt.items.length - 1 ? 'Finish quiz' : 'Next question'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </section>
  );
}
