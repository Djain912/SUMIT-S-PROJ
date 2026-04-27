"use client";

import { useState, useEffect } from 'react';
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
  contentHtml: string;
  isCorrect: boolean;
  orderIndex: number;
};

type Question = {
  id: string;
  level: Level | null;
  chapterId: string | null;
  subtopicId: string | null;
  promptHtml: string | null;
  explanationHtml: string | null;
  questionType: QuestionType;
  difficulty: Difficulty | null;
  isPublished: boolean;
  options: QuestionOption[];
};

const chaptersInFlight = new Map<Level, Promise<Chapter[]>>();
const questionsInFlight = new Map<string, Promise<Question[]>>();

async function fetchChapters(level: Level): Promise<Chapter[]> {
  const existing = chaptersInFlight.get(level);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const res = await fetch(`/api/admin/chapters?level=${level}`);
    const data = await res.json();
    return data.data || [];
  })();

  chaptersInFlight.set(level, request);
  request.finally(() => {
    chaptersInFlight.delete(level);
  });

  return request;
}

async function fetchQuestions(subtopicId: string): Promise<Question[]> {
  const existing = questionsInFlight.get(subtopicId);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const res = await fetch(`/api/admin/questions?subtopicId=${subtopicId}`);
    const data = await res.json();
    return data.data || [];
  })();

  questionsInFlight.set(subtopicId, request);
  request.finally(() => {
    questionsInFlight.delete(subtopicId);
  });

  return request;
}

async function saveQuestion(data: {
  subtopicId: string;
  level: Level;
  promptHtml: string;
  explanationHtml: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  isPublished: boolean;
  options: { contentHtml: string; isCorrect: boolean }[];
}) {
  const res = await fetch('/api/admin/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export function AdminQuestionsClient({ initialLevel = 'LEVEL_1' }: { initialLevel?: Level }) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editQuestionType, setEditQuestionType] = useState<QuestionType>('SINGLE_CHOICE');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('MEDIUM');
  const [editPublished, setEditPublished] = useState(false);
  const [editOptions, setEditOptions] = useState<{ contentHtml: string; isCorrect: boolean }[]>([
    { contentHtml: '', isCorrect: true },
    { contentHtml: '', isCorrect: false },
    { contentHtml: '', isCorrect: false },
    { contentHtml: '', isCorrect: false },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChapters(level).then(setChapters);
  }, [level]);

  useEffect(() => {
    if (selectedSubtopic) {
      fetchQuestions(selectedSubtopic).then(setQuestions);
    }
  }, [selectedSubtopic]);

  useEffect(() => {
    setLevel(initialLevel);
    setSelectedChapter('');
    setSelectedSubtopic('');
    setQuestions([]);
    setSelectedQuestion(null);
  }, [initialLevel]);

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);
  const subtopicQuestions = questions.filter(q => q.subtopicId === selectedSubtopic);

  const handleSave = async () => {
    if (!selectedSubtopic || !editPrompt) return;
    setSaving(true);
    try {
      await saveQuestion({
        subtopicId: selectedSubtopic,
        level,
        promptHtml: editPrompt,
        explanationHtml: editExplanation,
        questionType: editQuestionType,
        difficulty: editDifficulty,
        isPublished: editPublished,
        options: editOptions,
      });
      questionsInFlight.delete(selectedSubtopic);
      fetchQuestions(selectedSubtopic).then(setQuestions);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

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
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Subtopic</label>
            <select
              value={selectedSubtopic}
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Select subtopic</option>
              {selectedChapterData?.subtopics.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.title}
                </option>
              ))}
            </select>
          </div>

          {subtopicQuestions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Questions ({subtopicQuestions.length})</label>
              <div className="mt-1 space-y-1">
                {subtopicQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestion(q);
                      setEditPrompt(q.promptHtml || '');
                      setEditExplanation(q.explanationHtml || '');
                      setEditQuestionType(q.questionType);
                      setEditDifficulty(q.difficulty || 'MEDIUM');
                      setEditPublished(q.isPublished);
                      setIsEditing(false);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedQuestion?.id === q.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="block truncate">
                      {q.promptHtml?.replace(/<[^>]*>/g, '').slice(0, 40) || 'Question'}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {q.questionType} · {q.difficulty}
                      {q.isPublished && ' · Published'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {!selectedSubtopic ? (
            <p className="text-center text-zinc-500">
              Select a chapter and subtopic to view or create questions
            </p>
          ) : isEditing ? (
            <div className="space-y-4">
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
                <TinyMceEditor
                  value={editPrompt}
                  onChange={setEditPrompt}
                  placeholder="Write the question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Options</label>
                <div className="mt-2 space-y-2">
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type={editQuestionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => {
                          const newOpts = editOptions.map((o, idx) => ({
                            ...o,
                            isCorrect: editQuestionType === 'SINGLE_CHOICE' 
                              ? idx === i 
                              : idx === i ? !o.isCorrect : o.isCorrect,
                          }));
                          setEditOptions(newOpts);
                        }}
                      />
                      <input
                        value={opt.contentHtml}
                        onChange={(e) => {
                          const newOpts = [...editOptions];
                          newOpts[i] = { ...newOpts[i], contentHtml: e.target.value };
                          setEditOptions(newOpts);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Explanation</label>
                <TinyMceEditor
                  value={editExplanation}
                  onChange={setEditExplanation}
                  placeholder="Explain the answer..."
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={editPublished}
                    onChange={(e) => setEditPublished(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  Published
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </div>
          ) : !selectedQuestion ? (
            <div className="space-y-4">
              <p className="text-zinc-700">No questions for this subtopic yet</p>
              <button
                onClick={() => {
                  setEditPrompt('');
                  setEditExplanation('');
                  setEditQuestionType('SINGLE_CHOICE');
                  setEditDifficulty('MEDIUM');
                  setEditPublished(false);
                  setEditOptions([
                    { contentHtml: '', isCorrect: true },
                    { contentHtml: '', isCorrect: false },
                    { contentHtml: '', isCorrect: false },
                    { contentHtml: '', isCorrect: false },
                  ]);
                  setIsEditing(true);
                }}
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
                >
                  Edit
                </button>
              </div>
              <div
                className="prose prose-zinc max-w-none rounded-lg bg-zinc-50 p-4"
                dangerouslySetInnerHTML={{ __html: selectedQuestion.promptHtml || '' }}
              />
              <div>
                <p className="text-sm font-medium text-zinc-700">Options</p>
                <div className="mt-2 space-y-2">
                  {selectedQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${
                        opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-zinc-200'
                      }`}
                    >
                      <span className="text-sm text-zinc-900">{opt.contentHtml}</span>
                      {opt.isCorrect && (
                        <span className="ml-2 text-xs text-green-700">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {selectedQuestion.explanationHtml && (
                <div>
                  <p className="text-sm font-medium text-zinc-700">Explanation</p>
                  <div
                    className="mt-2 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700"
                    dangerouslySetInnerHTML={{ __html: selectedQuestion.explanationHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
