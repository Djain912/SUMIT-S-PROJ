'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLevelTabs, type AdminLevel } from '@/components/admin/admin-level-tabs';
import { TinyMceEditor } from '@/components/admin/tinymce-editor';

type Level = AdminLevel;
type QuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

type Subtopic = {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
};

type Chapter = {
  id: string;
  level: Level;
  title: string;
  subtopics: Subtopic[];
};

type QuestionOption = {
  id: string;
  contentJson: Record<string, unknown>;
  isCorrect: boolean;
  orderIndex: number;
};

type Question = {
  id: string;
  level: Level | null;
  chapterId: string | null;
  subtopicId: string | null;
  promptJson: Record<string, unknown>;
  explanationJson: Record<string, unknown> | null;
  questionType: QuestionType;
  difficulty: Difficulty | null;
  isPublished: boolean;
  options: QuestionOption[];
};

const chaptersInFlight = new Map<Level, Promise<Chapter[]>>();
const questionsInFlight = new Map<string, Promise<Question[]>>();

function extractTextFromRichJson(input: unknown): string {
  if (!input) {
    return '';
  }

  if (typeof input === 'string') {
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (typeof input !== 'object') {
    return '';
  }

  const node = input as { text?: string; content?: unknown[]; html?: string };
  const html = typeof node.html === 'string' ? node.html : '';
  const htmlText = html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const text = typeof node.text === 'string' ? node.text : htmlText;
  const childText = Array.isArray(node.content)
    ? node.content.map((child) => extractTextFromRichJson(child)).filter(Boolean).join(' ')
    : '';

  return `${text} ${childText}`.trim();
}

function getHtmlFromRichJson(input: unknown): string {
  if (!input) {
    return '';
  }

  if (typeof input === 'string') {
    return input;
  }

  if (typeof input === 'object') {
    const html = (input as { html?: string }).html;
    if (typeof html === 'string') {
      return html;
    }
  }

  return '';
}

function createEmptyOptions() {
  return [
    { contentHtml: '', isCorrect: true },
    { contentHtml: '', isCorrect: false },
    { contentHtml: '', isCorrect: false },
    { contentHtml: '', isCorrect: false },
  ];
}

async function fetchChapters(level: Level): Promise<Chapter[]> {
  const existing = chaptersInFlight.get(level);
  if (existing) return existing;

  const request = (async () => {
    const res = await fetch(`/api/admin/chapters?level=${level}`);
    const data = await res.json();
    return data.data || [];
  })();

  chaptersInFlight.set(level, request);
  request.finally(() => chaptersInFlight.delete(level));
  return request;
}

async function fetchQuestions(subtopicId: string): Promise<Question[]> {
  const existing = questionsInFlight.get(subtopicId);
  if (existing) return existing;

  const request = (async () => {
    const res = await fetch(`/api/admin/questions?subtopicId=${subtopicId}`);
    const data = await res.json();
    return data.data || [];
  })();

  questionsInFlight.set(subtopicId, request);
  request.finally(() => questionsInFlight.delete(subtopicId));
  return request;
}

export function AdminQuestionsClient({ initialLevel = 'LEVEL_1' }: { initialLevel?: Level }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>(initialLevel);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editPrompt, setEditPrompt] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editQuestionType, setEditQuestionType] = useState<QuestionType>('SINGLE_CHOICE');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('MEDIUM');
  const [editPublished, setEditPublished] = useState(false);
  const [editOptions, setEditOptions] = useState(createEmptyOptions());

  useEffect(() => {
    fetchChapters(level).then(setChapters);
  }, [level]);

  useEffect(() => {
    if (selectedSubtopic) {
      fetchQuestions(selectedSubtopic).then(setQuestions);
    } else {
      setQuestions([]);
      setSelectedQuestion(null);
    }
  }, [selectedSubtopic]);

  useEffect(() => {
    setLevel(initialLevel);
    setSelectedChapter('');
    setSelectedSubtopic('');
    setQuestions([]);
    setSelectedQuestion(null);
    setIsEditing(false);
    setEditingQuestionId(null);
  }, [initialLevel]);

  const selectedChapterData = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapter) ?? null,
    [chapters, selectedChapter],
  );

  const subtopicQuestions = useMemo(
    () => questions.filter((question) => question.subtopicId === selectedSubtopic),
    [questions, selectedSubtopic],
  );

  function startNewQuestion() {
    setEditingQuestionId(null);
    setSelectedQuestion(null);
    setIsEditing(true);
    setEditPrompt('');
    setEditExplanation('');
    setEditQuestionType('SINGLE_CHOICE');
    setEditDifficulty('MEDIUM');
    setEditPublished(false);
    setEditOptions(createEmptyOptions());
  }

  function loadQuestionIntoEditor(question: Question) {
    setEditingQuestionId(question.id);
    setSelectedQuestion(question);
    setIsEditing(false);
    setEditPrompt(getHtmlFromRichJson(question.promptJson));
    setEditExplanation(getHtmlFromRichJson(question.explanationJson));
    setEditQuestionType(question.questionType);
    setEditDifficulty(question.difficulty ?? 'MEDIUM');
    setEditPublished(question.isPublished);
    setEditOptions(
      question.options.map((option) => ({
        contentHtml: getHtmlFromRichJson(option.contentJson),
        isCorrect: option.isCorrect,
      })),
    );
  }

  async function saveCurrentQuestion() {
    if (!selectedSubtopic || !editPrompt.trim()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        level,
        chapterId: selectedChapter || null,
        subtopicId: selectedSubtopic || null,
        promptJson: { html: editPrompt },
        explanationJson: editExplanation ? { html: editExplanation } : null,
        questionType: editQuestionType,
        difficulty: editDifficulty,
        isPublished: editPublished,
        options: editOptions.map((option, index) => ({
          contentJson: { html: option.contentHtml },
          isCorrect: option.isCorrect,
          orderIndex: index,
        })),
      };

      const url = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
      const method = editingQuestionId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save question');
      }

      const savedQuestion = result.data as Question;
      questionsInFlight.delete(selectedSubtopic);
      if (editingQuestionId) {
        setQuestions(prev => prev.map(q => q.id === editingQuestionId ? savedQuestion : q));
      } else {
        setQuestions(prev => [...prev, savedQuestion]);
      }
      setSelectedQuestion(savedQuestion);
      loadQuestionIntoEditor(savedQuestion);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save question');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!window.confirm('Delete this question?')) {
      return;
    }

    const res = await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' });
    const result = await res.json();

    if (!result.success) {
      alert(result.error?.message || 'Failed to delete question');
      return;
    }

    questionsInFlight.delete(selectedSubtopic);
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion(null);
      setIsEditing(false);
      setEditingQuestionId(null);
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{level.replace('_', ' ').replace('LEVEL', 'Level')}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Question Bank</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Build practice questions tied to the same chapter and subtopic structure students study from.
          </p>
        </div>
        <AdminLevelTabs
          selectedLevel={level}
          onLevelChange={(nextLevel) => {
            setLevel(nextLevel);
            setSelectedChapter('');
            setSelectedSubtopic('');
            setQuestions([]);
            setSelectedQuestion(null);
            setEditingQuestionId(null);
            setIsEditing(false);
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Chapter</label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setSelectedSubtopic('');
                setQuestions([]);
                setSelectedQuestion(null);
                setIsEditing(false);
                setEditingQuestionId(null);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Subtopic</label>
            <select
              value={selectedSubtopic}
              onChange={(e) => {
                setSelectedSubtopic(e.target.value);
                setSelectedQuestion(null);
                setIsEditing(false);
                setEditingQuestionId(null);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select subtopic</option>
              {selectedChapterData?.subtopics.map((subtopic) => (
                <option key={subtopic.id} value={subtopic.id}>
                  {subtopic.title}
                </option>
              ))}
            </select>
          </div>

          {selectedSubtopic ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-zinc-700">Questions ({subtopicQuestions.length})</label>
                <button
                  type="button"
                  onClick={startNewQuestion}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Add another question
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {subtopicQuestions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => loadQuestionIntoEditor(question)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selectedQuestion?.id === question.id ? 'border-blue-600 bg-blue-50' : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="block truncate font-medium text-zinc-950">
                      {extractTextFromRichJson(question.promptJson).slice(0, 60) || 'Question'}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {question.questionType} · {question.difficulty}
                      {question.isPublished && ' · Published'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {!selectedSubtopic ? (
            <p className="text-center text-zinc-500">Select a chapter and subtopic to view or create questions</p>
          ) : isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-950">{editingQuestionId ? 'Editing question' : 'Creating question'}</p>
                  <p className="text-xs text-zinc-500">Keep the same subtopic selected to add multiple questions quickly.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingQuestionId(null);
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Close editor
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Question Type</label>
                  <select
                    value={editQuestionType}
                    onChange={(e) => setEditQuestionType(e.target.value as QuestionType)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="SINGLE_CHOICE">Single Choice</option>
                    <option value="MULTI_CHOICE">Multiple Choice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Difficulty</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as Difficulty)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Question</label>
                <TinyMceEditor value={editPrompt} onChange={setEditPrompt} placeholder="Write the question..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Options</label>
                <div className="mt-2 space-y-2">
                  {editOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type={editQuestionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                        name="correctOption"
                        checked={option.isCorrect}
                        onChange={() => {
                          setEditOptions((current) =>
                            current.map((item, itemIndex) => {
                              if (editQuestionType === 'SINGLE_CHOICE') {
                                return { ...item, isCorrect: itemIndex === index };
                              }

                              return {
                                ...item,
                                isCorrect: itemIndex === index ? !item.isCorrect : item.isCorrect,
                              };
                            }),
                          );
                        }}
                      />
                      <input
                        value={option.contentHtml}
                        onChange={(e) => {
                          const nextOptions = [...editOptions];
                          nextOptions[index] = { ...nextOptions[index], contentHtml: e.target.value };
                          setEditOptions(nextOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextOptions = editOptions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, orderIndex: itemIndex }));
                          setEditOptions(nextOptions.length > 0 ? nextOptions : createEmptyOptions());
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditOptions((current) => [...current, { contentHtml: '', isCorrect: false }])}
                  className="mt-3 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Add option
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Explanation</label>
                <TinyMceEditor value={editExplanation} onChange={setEditExplanation} placeholder="Explain the answer..." />
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Published
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveCurrentQuestion()}
                  disabled={saving}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
                </button>
                {!editingQuestionId ? (
                  <button
                    type="button"
                    onClick={() => {
                      void saveCurrentQuestion().then(() => {
                        if (!saving) {
                          startNewQuestion();
                        }
                      });
                    }}
                    disabled={saving}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save and add another'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : selectedQuestion ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm text-zinc-500">
                    {selectedQuestion.questionType} · {selectedQuestion.difficulty}
                  </span>
                  {selectedQuestion.isPublished && (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Published
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startNewQuestion();
                    }}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Add another question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadQuestionIntoEditor(selectedQuestion);
                      setIsEditing(true);
                    }}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteQuestion(selectedQuestion.id)}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete question
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 p-4">
                <p className="text-sm leading-7 text-zinc-900">
                  {extractTextFromRichJson(selectedQuestion.promptJson) || 'Question text unavailable'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-700">Options</p>
                <div className="mt-2 space-y-2">
                  {selectedQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className={`rounded-lg border p-3 ${option.isCorrect ? 'border-green-300 bg-green-50' : 'border-zinc-200'}`}
                    >
                      <span className="text-sm text-zinc-900">{extractTextFromRichJson(option.contentJson) || 'Option'}</span>
                      {option.isCorrect && <span className="ml-2 text-xs text-green-700">(Correct)</span>}
                    </div>
                  ))}
                </div>
              </div>

              {selectedQuestion.explanationJson ? (
                <div>
                  <p className="text-sm font-medium text-zinc-700">Explanation</p>
                  <div className="mt-2 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
                    {extractTextFromRichJson(selectedQuestion.explanationJson) || 'No explanation available.'}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-700">No questions for this subtopic yet</p>
              <button
                type="button"
                onClick={startNewQuestion}
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
