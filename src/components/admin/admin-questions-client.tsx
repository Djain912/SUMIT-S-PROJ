'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

function tiptapNodeToHtml(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; marks?: { type: string }[]; content?: unknown[] };

  if (n.type === 'text') {
    let text = n.text ?? '';
    // escape HTML entities
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const marks = n.marks ?? [];
    for (const m of marks) {
      if (m.type === 'bold') text = `<strong>${text}</strong>`;
      else if (m.type === 'italic') text = `<em>${text}</em>`;
      else if (m.type === 'underline') text = `<u>${text}</u>`;
      else if (m.type === 'code') text = `<code>${text}</code>`;
    }
    return text;
  }

  const inner = (n.content ?? []).map(tiptapNodeToHtml).join('');

  switch (n.type) {
    case 'doc': return inner;
    case 'paragraph': return `<p>${inner}</p>`;
    case 'hardBreak': return '<br>';
    case 'bulletList': return `<ul>${inner}</ul>`;
    case 'orderedList': return `<ol>${inner}</ol>`;
    case 'listItem': return `<li>${inner}</li>`;
    case 'blockquote': return `<blockquote>${inner}</blockquote>`;
    case 'codeBlock': return `<pre><code>${inner}</code></pre>`;
    case 'heading': {
      const level = (node as { attrs?: { level?: number } }).attrs?.level ?? 2;
      return `<h${level}>${inner}</h${level}>`;
    }
    default: return inner;
  }
}

function getHtmlFromRichJson(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (typeof input !== 'object') return '';
  const obj = input as { html?: string; type?: string };
  // { html: "..." } format (manually created questions)
  if (typeof obj.html === 'string') return obj.html;
  // TipTap doc format (seeded questions)
  if (obj.type === 'doc') return tiptapNodeToHtml(input);
  return '';
}

/** Options are plain-text inputs — strip any block-level wrapper tags TinyMCE or TipTap may have added */
function getPlainTextFromRichJson(input: unknown): string {
  const html = getHtmlFromRichJson(input);
  // Remove wrapping <p>...</p> if the entire string is a single paragraph
  return html.replace(/^<p>([\s\S]*?)<\/p>$/, '$1').trim();
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
    const res = await fetch(`/api/admin/questions?subtopicId=${subtopicId}&limit=500`);
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
  const [publishingAll, setPublishingAll] = useState(false);

  const [editPrompt, setEditPrompt] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editQuestionType, setEditQuestionType] = useState<QuestionType>('SINGLE_CHOICE');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('MEDIUM');
  const [editPublished, setEditPublished] = useState(false);
  const [editOptions, setEditOptions] = useState(createEmptyOptions());

  // ── AI Generator state ────────────────────────────────────────────────────
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCount, setAiCount] = useState(50);
  const [aiPdfs, setAiPdfs] = useState<File[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ created: number } | null>(null);
  const [aiError, setAiError] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  async function handleGenerateQuestions() {
    if (!selectedSubtopic || !selectedChapter) return;
    setAiGenerating(true);
    setAiResult(null);
    setAiError('');

    try {
      const form = new FormData();
      form.append('subtopicId', selectedSubtopic);
      form.append('chapterId', selectedChapter);
      form.append('level', level);
      form.append('count', String(aiCount));
      aiPdfs.forEach((pdf, i) => form.append(`pdf_${i}`, pdf));

      const res = await fetch('/api/admin/generate-questions', { method: 'POST', body: form });
      const data = await res.json();

      if (!data.success) throw new Error(data.error?.message ?? 'Generation failed');

      setAiResult(data.data);
      // Reload questions list
      questionsInFlight.delete(selectedSubtopic);
      const fresh = await fetchQuestions(selectedSubtopic);
      setQuestions(fresh);
      router.refresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAiGenerating(false);
    }
  }

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
        contentHtml: getPlainTextFromRichJson(option.contentJson),
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

  async function handleTogglePublish(question: Question) {
    const res = await fetch(`/api/admin/questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: question.level,
        chapterId: question.chapterId,
        subtopicId: question.subtopicId,
        promptJson: question.promptJson,
        explanationJson: question.explanationJson,
        questionType: question.questionType,
        difficulty: question.difficulty,
        isPublished: !question.isPublished,
        options: question.options.map((o) => ({
          contentJson: o.contentJson,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })),
      }),
    });
    const result = await res.json();
    if (!result.success) { alert(result.error?.message || 'Failed to update'); return; }
    const updated = result.data as Question;
    setQuestions((prev) => prev.map((q) => q.id === updated.id ? updated : q));
    setSelectedQuestion(updated);
    router.refresh();
  }

  async function handlePublishAll() {
    const unpublished = subtopicQuestions.filter((q) => !q.isPublished);
    if (unpublished.length === 0) { alert('All questions are already published.'); return; }
    if (!window.confirm(`Publish all ${unpublished.length} unpublished questions for this subtopic?`)) return;

    setPublishingAll(true);
    try {
      for (const q of unpublished) {
        await fetch(`/api/admin/questions/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: q.level, chapterId: q.chapterId, subtopicId: q.subtopicId,
            promptJson: q.promptJson, explanationJson: q.explanationJson,
            questionType: q.questionType, difficulty: q.difficulty, isPublished: true,
            options: q.options.map((o) => ({ contentJson: o.contentJson, isCorrect: o.isCorrect, orderIndex: o.orderIndex })),
          }),
        });
      }
      questionsInFlight.delete(selectedSubtopic);
      const fresh = await fetchQuestions(selectedSubtopic);
      setQuestions(fresh);
      setSelectedQuestion(null);
      router.refresh();
    } finally {
      setPublishingAll(false);
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
              {/* Publish All button — shown when there are unpublished questions */}
              {subtopicQuestions.some((q) => !q.isPublished) && (
                <button
                  type="button"
                  onClick={() => void handlePublishAll()}
                  disabled={publishingAll}
                  className="mt-2 w-full rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {publishingAll ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Publishing… please wait
                    </span>
                  ) : (
                    `✓ Publish All (${subtopicQuestions.filter((q) => !q.isPublished).length} unpublished)`
                  )}
                </button>
              )}

              {/* AI Generate button */}
              <button
                type="button"
                onClick={() => { setShowAiPanel((v) => !v); setAiResult(null); setAiError(''); }}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-100 flex items-center gap-2"
              >
                <span>🤖</span>
                <span>Generate with AI</span>
                <span className="ml-auto text-zinc-400">{showAiPanel ? '▲' : '▼'}</span>
              </button>

              {/* AI Panel */}
              {showAiPanel && (
                <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm space-y-3">
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Upload a PDF (optional) + choose how many questions. AI reads your notes + PDF and generates CMT-level MCQs with explanations. All questions are saved as <strong>unpublished</strong> — review before publishing.
                  </p>

                  {/* PDF Upload — up to 10 files */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      PDFs (optional, up to 10)
                    </label>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={(e) => {
                        const selected = Array.from(e.target.files ?? []).slice(0, 10);
                        setAiPdfs((prev) => {
                          const combined = [...prev, ...selected];
                          return combined.slice(0, 10);
                        });
                        if (pdfInputRef.current) pdfInputRef.current.value = '';
                      }}
                      className="hidden"
                    />
                    {aiPdfs.length < 10 && (
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 text-center"
                      >
                        + Click to add PDFs ({aiPdfs.length}/10)
                      </button>
                    )}
                    {aiPdfs.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {aiPdfs.map((f, i) => (
                          <li key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1">
                            <span className="text-[11px] text-zinc-700 truncate max-w-[180px]">📄 {f.name}</span>
                            <button
                              type="button"
                              onClick={() => setAiPdfs((prev) => prev.filter((_, idx) => idx !== i))}
                              className="ml-2 text-[10px] text-red-500 hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Count */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Questions to generate</label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
                    >
                      <option value={25}>25 questions (~1 min)</option>
                      <option value={50}>50 questions (~2 min)</option>
                      <option value={75}>75 questions (~3 min)</option>
                      <option value={100}>100 questions (~4 min)</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <button
                    type="button"
                    onClick={() => void handleGenerateQuestions()}
                    disabled={aiGenerating}
                    className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiGenerating ? '⏳ Generating... please wait' : '🚀 Generate Questions'}
                  </button>

                  {/* Result */}
                  {aiResult && (
                    <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                      ✅ {aiResult.created} questions created! Review them in the list and publish when ready.
                    </p>
                  )}
                  {aiError && (
                    <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      ❌ {aiError}
                    </p>
                  )}
                </div>
              )}
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
                <TinyMceEditor key={`prompt-${editingQuestionId ?? 'new'}`} initialValue={editPrompt} onChange={setEditPrompt} placeholder="Write the question..." />
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
                <TinyMceEditor key={`explanation-${editingQuestionId ?? 'new'}`} initialValue={editExplanation} onChange={setEditExplanation} placeholder="Explain the answer..." />
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTogglePublish(selectedQuestion)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selectedQuestion.isPublished
                        ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedQuestion.isPublished ? 'Unpublish' : '✓ Publish'}
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
                    onClick={() => startNewQuestion()}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Add another
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteQuestion(selectedQuestion.id)}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startNewQuestion}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Create Question
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAiPanel(true); setAiResult(null); setAiError(''); }}
                  className="rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  🤖 Generate with AI
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Use &ldquo;Generate with AI&rdquo; to auto-create CMT-level MCQs from your notes and PDFs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
