"use client";

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

type Chapter = {
  id: string;
  level: Level;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  isPublished: boolean;
  _count?: { subtopics: number };
};

type Subtopic = {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  isPublished: boolean;
};

type Note = {
  id: string;
  subtopicId: string;
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string | null;
  orderIndex: number;
  isPublished: boolean;
};

type QuestionOption = {
  id?: string;
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
  questionType: 'SINGLE_CHOICE' | 'MULTI_CHOICE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  isPublished: boolean;
  options: QuestionOption[];
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: 'image' | 'raw';
};

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  bytes: number;
  resource_type: string;
};

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] };
const levelOptions: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];
const sectionLinks = [
  { key: 'chapters', id: 'chapters-workspace', label: 'Chapters', description: 'Build the level tree' },
  { key: 'subtopics', id: 'subtopics-workspace', label: 'Subtopics', description: 'Group lessons by chapter' },
  { key: 'notes', id: 'notes-workspace', label: 'Notes', description: 'Write and preview study content' },
  { key: 'questions', id: 'questions-workspace', label: 'Questions', description: 'Create quiz items' },
] as const;

function formatLevel(level: Level) {
  return level.replace('_', ' ');
}

function createEmptyQuestionOptions(): QuestionOption[] {
  return [
    { contentJson: emptyDocument, isCorrect: true, orderIndex: 0 },
    { contentJson: emptyDocument, isCorrect: false, orderIndex: 1 },
    { contentJson: emptyDocument, isCorrect: false, orderIndex: 2 },
    { contentJson: emptyDocument, isCorrect: false, orderIndex: 3 },
  ];
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string } };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message ?? 'Request failed');
  }

  return payload.data as T;
}

async function uploadToCloudinarySigned(file: File, resourceType: 'image' | 'raw', kind: 'IMAGE' | 'PDF') {
  const signature = await apiJson<UploadSignature>('/api/admin/uploads/signature', {
    method: 'POST',
    body: JSON.stringify({ resourceType }),
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const uploadPayload = (await uploadResponse.json()) as CloudinaryUploadResult & { error?: { message?: string } };

  if (!uploadResponse.ok || !uploadPayload.secure_url || !uploadPayload.public_id) {
    throw new Error(uploadPayload.error?.message ?? 'Cloudinary upload failed');
  }

  await apiJson('/api/admin/uploads/record', {
    method: 'POST',
    body: JSON.stringify({
      url: uploadPayload.secure_url,
      publicId: uploadPayload.public_id,
      kind,
      mimeType: file.type || (kind === 'PDF' ? 'application/pdf' : 'image/*'),
      originalName: file.name,
      sizeBytes: uploadPayload.bytes ?? file.size,
    }),
  });

  return uploadPayload.secure_url;
}

export function AdminCmsClient() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeSection, setActiveSection] = useState<(typeof sectionLinks)[number]['key']>('chapters');
  const [selectedLevel, setSelectedLevel] = useState<Level>('LEVEL_1');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingSubtopicId, setEditingSubtopicId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const uploadEditorImage = async (file: File) => {
    setStatusMessage('Uploading image...');
    const imageUrl = await uploadToCloudinarySigned(file, 'image', 'IMAGE');
    setStatusMessage('Image uploaded.');

    return imageUrl;
  };

  const [chapterForm, setChapterForm] = useState<{
    level: Level;
    title: string;
    slug: string;
    description: string;
    orderIndex: number;
    isPublished: boolean;
  }>({
    level: 'LEVEL_1' as Level,
    title: '',
    slug: '',
    description: '',
    orderIndex: 0,
    isPublished: false,
  });

  const [subtopicForm, setSubtopicForm] = useState<{
    chapterId: string;
    title: string;
    slug: string;
    description: string;
    orderIndex: number;
    isPublished: boolean;
  }>({
    chapterId: '',
    title: '',
    slug: '',
    description: '',
    orderIndex: 0,
    isPublished: false,
  });

  const [noteForm, setNoteForm] = useState<{
    subtopicId: string;
    title: string;
    contentJson: Record<string, unknown>;
    contentHtml: string;
    orderIndex: number;
    isPublished: boolean;
  }>({
    subtopicId: '',
    title: '',
    contentJson: emptyDocument,
    contentHtml: '<p></p>',
    orderIndex: 0,
    isPublished: false,
  });

  const [questionForm, setQuestionForm] = useState<{
    level: Level;
    chapterId: string;
    subtopicId: string;
    promptJson: Record<string, unknown>;
    promptHtml: string;
    explanationJson: Record<string, unknown>;
    explanationHtml: string;
    questionType: 'SINGLE_CHOICE' | 'MULTI_CHOICE';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    isPublished: boolean;
    options: QuestionOption[];
  }>({
    level: 'LEVEL_1' as Level,
    chapterId: '',
    subtopicId: '',
    promptJson: emptyDocument,
    promptHtml: '<p></p>',
    explanationJson: emptyDocument,
    explanationHtml: '<p></p>',
    questionType: 'SINGLE_CHOICE' as 'SINGLE_CHOICE' | 'MULTI_CHOICE',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    isPublished: false,
    options: createEmptyQuestionOptions(),
  });

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );

  const selectedSubtopic = useMemo(
    () => subtopics.find((subtopic) => subtopic.id === selectedSubtopicId) ?? null,
    [subtopics, selectedSubtopicId],
  );

  async function loadChapters(nextLevel?: Level) {
    const level = nextLevel ?? selectedLevel;
    const chapterData = await apiJson<Chapter[]>(`/api/admin/chapters?level=${level}`);
    setChapters(chapterData);
    setSelectedChapterId((current) => {
      if (chapterData.some((chapter) => chapter.id === current)) {
        return current;
      }

      return chapterData[0]?.id ?? '';
    });
  }

  async function loadSubtopics(chapterId: string) {
    if (!chapterId) {
      setSubtopics([]);
      setSelectedSubtopicId('');
      return;
    }

    const subtopicData = await apiJson<Subtopic[]>(`/api/admin/subtopics?chapterId=${chapterId}`);
    setSubtopics(subtopicData);
    setSelectedSubtopicId((current) => {
      if (subtopicData.some((subtopic) => subtopic.id === current)) {
        return current;
      }

      return subtopicData[0]?.id ?? '';
    });
  }

  async function loadNotes(subtopicId: string) {
    if (!subtopicId) {
      setNotes([]);
      return;
    }

    const noteData = await apiJson<Note[]>(`/api/admin/notes?subtopicId=${subtopicId}`);
    setNotes(noteData);
  }

  async function loadQuestions() {
    const questionData = await apiJson<Question[]>('/api/admin/questions');
    setQuestions(questionData);
  }

  async function reloadAll() {
    await Promise.all([loadChapters(), loadQuestions()]);
    if (selectedChapterId) {
      await loadSubtopics(selectedChapterId);
    }
    if (selectedSubtopicId) {
      await loadNotes(selectedSubtopicId);
    }
  }

  useEffect(() => {
    void loadChapters(selectedLevel);
    void loadQuestions();
  }, [selectedLevel]);

  useEffect(() => {
    void loadSubtopics(selectedChapterId);
  }, [selectedChapterId]);

  useEffect(() => {
    void loadNotes(selectedSubtopicId);
  }, [selectedSubtopicId]);

  function clearChapterForm() {
    setEditingChapterId(null);
    setChapterForm({
      level: selectedLevel,
      title: '',
      slug: '',
      description: '',
      orderIndex: 0,
      isPublished: false,
    });
  }

  function clearSubtopicForm() {
    setEditingSubtopicId(null);
    setSubtopicForm({
      chapterId: selectedChapterId,
      title: '',
      slug: '',
      description: '',
      orderIndex: 0,
      isPublished: false,
    });
  }

  function clearNoteForm() {
    setEditingNoteId(null);
    setNoteForm({
      subtopicId: selectedSubtopicId,
      title: '',
      contentJson: emptyDocument,
      contentHtml: '<p></p>',
      orderIndex: 0,
      isPublished: false,
    });
  }

  function clearQuestionForm() {
    setEditingQuestionId(null);
    setQuestionForm({
      level: selectedLevel,
      chapterId: selectedChapterId,
      subtopicId: selectedSubtopicId,
      promptJson: emptyDocument,
      promptHtml: '<p></p>',
      explanationJson: emptyDocument,
      explanationHtml: '<p></p>',
      questionType: 'SINGLE_CHOICE',
      difficulty: 'MEDIUM',
      isPublished: false,
      options: createEmptyQuestionOptions(),
    });
  }

  const visibleQuestions = useMemo(
    () => questions.filter((question) => question.level === selectedLevel || question.level === null),
    [questions, selectedLevel],
  );

  function openSection(section: (typeof sectionLinks)[number]['key']) {
    setActiveSection(section);
    const anchor = sectionLinks.find((item) => item.key === section);

    if (anchor) {
      document.getElementById(anchor.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setQuestionType(nextType: 'SINGLE_CHOICE' | 'MULTI_CHOICE') {
    setQuestionForm((current) => {
      if (nextType === 'MULTI_CHOICE') {
        return { ...current, questionType: nextType };
      }

      const firstCorrectIndex = current.options.findIndex((option) => option.isCorrect);
      const normalizedOptions = current.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === (firstCorrectIndex >= 0 ? firstCorrectIndex : 0),
      }));

      return {
        ...current,
        questionType: nextType,
        options: normalizedOptions,
      };
    });
  }

  function setSingleCorrectOption(index: number, checked: boolean) {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => {
        if (current.questionType === 'MULTI_CHOICE') {
          return {
            ...option,
            isCorrect: optionIndex === index ? checked : option.isCorrect,
          };
        }

        return {
          ...option,
          isCorrect: optionIndex === index ? checked : false,
        };
      }),
    }));
  }

  async function handleChapterSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('Saving chapter...');

    const payload = {
      ...chapterForm,
      description: chapterForm.description || null,
    };

    const url = editingChapterId ? `/api/admin/chapters/${editingChapterId}` : '/api/admin/chapters';
    const method = editingChapterId ? 'PATCH' : 'POST';

    await apiJson(url, { method, body: JSON.stringify(payload) });
    await reloadAll();
    clearChapterForm();
    setStatusMessage('Chapter saved.');
  }

  async function handleSubtopicSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('Saving subtopic...');

    const payload = {
      ...subtopicForm,
      description: subtopicForm.description || null,
    };

    const url = editingSubtopicId ? `/api/admin/subtopics/${editingSubtopicId}` : '/api/admin/subtopics';
    const method = editingSubtopicId ? 'PATCH' : 'POST';

    await apiJson(url, { method, body: JSON.stringify(payload) });
    await reloadAll();
    clearSubtopicForm();
    setStatusMessage('Subtopic saved.');
  }

  async function handleNoteSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('Saving note...');

    const payload = {
      subtopicId: noteForm.subtopicId,
      title: noteForm.title,
      contentJson: noteForm.contentJson,
      contentHtml: noteForm.contentHtml,
      orderIndex: noteForm.orderIndex,
      isPublished: noteForm.isPublished,
    };

    const url = editingNoteId ? `/api/admin/notes/${editingNoteId}` : '/api/admin/notes';
    const method = editingNoteId ? 'PATCH' : 'POST';

    await apiJson(url, { method, body: JSON.stringify(payload) });
    await reloadAll();
    clearNoteForm();
    setStatusMessage('Note saved.');
  }

  async function handleQuestionSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('Saving question...');

    const payload = {
      level: questionForm.level,
      chapterId: questionForm.chapterId || null,
      subtopicId: questionForm.subtopicId || null,
      promptJson: questionForm.promptJson,
      explanationJson: questionForm.explanationJson,
      questionType: questionForm.questionType,
      difficulty: questionForm.difficulty,
      isPublished: questionForm.isPublished,
      options: questionForm.options,
    };

    const url = editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
    const method = editingQuestionId ? 'PATCH' : 'POST';

    await apiJson(url, { method, body: JSON.stringify(payload) });
    await reloadAll();
    clearQuestionForm();
    setStatusMessage('Question saved.');
  }

  async function handleDelete(resource: 'chapter' | 'subtopic' | 'note' | 'question', id: string) {
    if (!window.confirm('Delete this item?')) {
      return;
    }

    const endpointMap = {
      chapter: `/api/admin/chapters/${id}`,
      subtopic: `/api/admin/subtopics/${id}`,
      note: `/api/admin/notes/${id}`,
      question: `/api/admin/questions/${id}`,
    };

    await apiJson(endpointMap[resource], { method: 'DELETE' });
    await reloadAll();
    setStatusMessage('Item deleted.');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-zinc-700">CMT Level</label>
        <select
          value={selectedLevel}
          onChange={(event) => {
            const nextLevel = event.target.value as Level;
            setSelectedLevel(nextLevel);
            setChapterForm((current) => ({ ...current, level: nextLevel }));
            setQuestionForm((current) => ({ ...current, level: nextLevel }));
            setStatusMessage('');
            setEditingChapterId(null);
            setEditingSubtopicId(null);
            setEditingNoteId(null);
            setEditingQuestionId(null);
            setSelectedChapterId('');
            setSelectedSubtopicId('');
          }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {levelOptions.map((level) => (
            <option key={level} value={level}>
              {level.replace('_', ' ')}
            </option>
          ))}
        </select>
        <p className="text-sm text-zinc-500">{statusMessage || 'Manage content scoped to the selected CMT level.'}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Workspace guide</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Edit content in the same order learners will experience it.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            Start with a level, jump to a section, then use the live editor and preview to make sure the structure,
            wording, and answer choices are easy to read before publishing.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {sectionLinks.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => openSection(section.key)}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Current context</p>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <p>
              Level: <span className="font-semibold text-zinc-950">{formatLevel(selectedLevel)}</span>
            </p>
            <p>
              Chapter: <span className="font-semibold text-zinc-950">{selectedChapter?.title ?? 'No chapter selected'}</span>
            </p>
            <p>
              Subtopic: <span className="font-semibold text-zinc-950">{selectedSubtopic?.title ?? 'No subtopic selected'}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Chapters', value: chapters.length },
                { label: 'Subtopics', value: subtopics.length },
                { label: 'Notes', value: notes.length },
                { label: 'Questions', value: visibleQuestions.length },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div id="chapters-workspace" className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Chapters</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950">Create or edit a chapter</h2>
            </div>
            <button onClick={clearChapterForm} className="rounded-full border border-zinc-200 px-4 py-2 text-sm">
              New chapter
            </button>
          </div>

          <form onSubmit={handleChapterSave} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700">Level</span>
                <select
                  value={chapterForm.level}
                  onChange={(event) => setChapterForm((current) => ({ ...current, level: event.target.value as Level }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                >
                  {levelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700">Order</span>
                <input
                  type="number"
                  value={chapterForm.orderIndex}
                  onChange={(event) => setChapterForm((current) => ({ ...current, orderIndex: parseInt(event.target.value, 10) || 0 }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Title</span>
              <input
                required
                value={chapterForm.title}
                onChange={(event) => setChapterForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Slug</span>
              <input
                required
                onChange={(event) => setChapterForm((current) => ({ ...current, slug: event.target.value }))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm block">
              <span className="font-medium text-zinc-700">Description</span>
              <textarea
                value={chapterForm.description}
                onChange={(event) => setChapterForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full rounded-2xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={chapterForm.isPublished}
                onChange={(event) => setChapterForm((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              Published
            </label>
            <button className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white">
              {editingChapterId ? 'Update chapter' : 'Create chapter'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-950">{chapter.title}</p>
                    <p className="text-xs text-zinc-500">
                      {chapter.level.replace('_', ' ')} · {chapter.slug} · {chapter._count?.subtopics ?? 0} subtopics
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChapterId(chapter.id);
                        setChapterForm({
                          level: chapter.level,
                          title: chapter.title,
                          slug: chapter.slug,
                          description: chapter.description ?? '',
                          orderIndex: chapter.orderIndex,
                          isPublished: chapter.isPublished,
                        });
                        setSelectedChapterId(chapter.id);
                        setSelectedLevel(chapter.level);
                      }}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete('chapter', chapter.id)}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div id="subtopics-workspace" className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Subtopics</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-950">Create or edit a subtopic</h2>
              </div>
              <button onClick={clearSubtopicForm} className="rounded-full border border-zinc-200 px-4 py-2 text-sm">
                New subtopic
              </button>
            </div>

            <form onSubmit={handleSubtopicSave} className="mt-6 space-y-4">
              <label className="space-y-2 text-sm block">
                <span className="font-medium text-zinc-700">Chapter</span>
                <select
                  value={subtopicForm.chapterId}
                  onChange={(event) => setSubtopicForm((current) => ({ ...current, chapterId: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                >
                  <option value="">Select chapter</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Title</span>
                  <input
                    required
                    value={subtopicForm.title}
                    onChange={(event) => setSubtopicForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Slug</span>
                  <input
                    required
                    onChange={(event) => setSubtopicForm((current) => ({ ...current, slug: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm block">
                <span className="font-medium text-zinc-700">Description</span>
                <textarea
                  value={subtopicForm.description}
                  onChange={(event) => setSubtopicForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-2xl border border-zinc-200 px-3 py-2"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Order</span>
                  <input
                    type="number"
                    value={subtopicForm.orderIndex}
                    onChange={(event) => setSubtopicForm((current) => ({ ...current, orderIndex: parseInt(event.target.value, 10) || 0 }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 pt-8">
                  <input
                    type="checkbox"
                    checked={subtopicForm.isPublished}
                    onChange={(event) => setSubtopicForm((current) => ({ ...current, isPublished: event.target.checked }))}
                  />
                  Published
                </label>
              </div>
              <button className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white">
                {editingSubtopicId ? 'Update subtopic' : 'Create subtopic'}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {subtopics.map((subtopic) => (
                <div key={subtopic.id} className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">{subtopic.title}</p>
                      <p className="text-xs text-zinc-500">{subtopic.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubtopicId(subtopic.id);
                          setSubtopicForm({
                            chapterId: subtopic.chapterId,
                            title: subtopic.title,
                            slug: subtopic.slug,
                            description: subtopic.description ?? '',
                            orderIndex: subtopic.orderIndex,
                            isPublished: subtopic.isPublished,
                          });
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('subtopic', subtopic.id)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="notes-workspace" className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Notes</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-950">Rich note editor</h2>
              </div>
              <button onClick={clearNoteForm} className="rounded-full border border-zinc-200 px-4 py-2 text-sm">
                New note
              </button>
            </div>

            <form onSubmit={handleNoteSave} className="mt-6 space-y-4">
              <label className="space-y-2 text-sm block">
                <span className="font-medium text-zinc-700">Subtopic</span>
                <select
                  value={noteForm.subtopicId}
                  onChange={(event) => setNoteForm((current) => ({ ...current, subtopicId: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                >
                  <option value="">Select subtopic</option>
                  {subtopics.map((subtopic) => (
                    <option key={subtopic.id} value={subtopic.id}>
                      {subtopic.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Title</span>
                  <input
                    value={noteForm.title}
                    onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Order</span>
                  <input
                    type="number"
                    value={noteForm.orderIndex}
                    onChange={(event) => setNoteForm((current) => ({ ...current, orderIndex: parseInt(event.target.value, 10) || 0 }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  />
                </label>
              </div>
              <RichTextEditor
                value={noteForm.contentJson}
                onChange={({ json, html }) =>
                  setNoteForm((current) => ({ ...current, contentJson: json, contentHtml: html }))
                }
                placeholder="Write the note content"
                onUploadImage={uploadEditorImage}
              />
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={noteForm.isPublished}
                  onChange={(event) => setNoteForm((current) => ({ ...current, isPublished: event.target.checked }))}
                />
                Published
              </label>
              <button className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white">
                {editingNoteId ? 'Update note' : 'Create note'}
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Note preview</p>
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-semibold text-zinc-950">{noteForm.title || 'Untitled note'}</p>
                <p className="mt-1 text-xs text-zinc-500">{selectedSubtopic?.title ?? 'Choose a subtopic to preview the context.'}</p>
                <div
                  className="mt-4 space-y-4 text-sm leading-7 text-zinc-700"
                  dangerouslySetInnerHTML={{ __html: noteForm.contentHtml }}
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">{note.title}</p>
                      <p className="text-xs text-zinc-500">{note.orderIndex} · {note.isPublished ? 'Published' : 'Draft'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setNoteForm({
                            subtopicId: note.subtopicId,
                            title: note.title,
                            contentJson: note.contentJson,
                            contentHtml: note.contentHtml ?? '',
                            orderIndex: note.orderIndex,
                            isPublished: note.isPublished,
                          });
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('note', note.id)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="questions-workspace" className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Questions</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-950">Quiz builder</h2>
              </div>
              <button onClick={clearQuestionForm} className="rounded-full border border-zinc-200 px-4 py-2 text-sm">
                New question
              </button>
            </div>

            <form onSubmit={handleQuestionSave} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Level</span>
                  <select
                    value={questionForm.level}
                    onChange={(event) => setQuestionForm((current) => ({ ...current, level: event.target.value as Level }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    {levelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Type</span>
                  <select
                    value={questionForm.questionType}
                    onChange={(event) => setQuestionType(event.target.value as 'SINGLE_CHOICE' | 'MULTI_CHOICE')}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    <option value="SINGLE_CHOICE">Single choice</option>
                    <option value="MULTI_CHOICE">Multiple choice</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Chapter</span>
                  <select
                    value={questionForm.chapterId}
                    onChange={(event) => setQuestionForm((current) => ({ ...current, chapterId: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    <option value="">Optional</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Subtopic</span>
                  <select
                    value={questionForm.subtopicId}
                    onChange={(event) => setQuestionForm((current) => ({ ...current, subtopicId: event.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    <option value="">Optional</option>
                    {subtopics.map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-sm block">
                <span className="font-medium text-zinc-700">Prompt</span>
                <RichTextEditor
                  value={questionForm.promptJson}
                  onChange={({ json, html }) =>
                    setQuestionForm((current) => ({ ...current, promptJson: json, promptHtml: html }))
                  }
                  placeholder="Write the question prompt"
                  onUploadImage={uploadEditorImage}
                />
              </label>
              <label className="space-y-2 text-sm block">
                <span className="font-medium text-zinc-700">Explanation</span>
                <RichTextEditor
                  value={questionForm.explanationJson}
                  onChange={({ json, html }) =>
                    setQuestionForm((current) => ({ ...current, explanationJson: json, explanationHtml: html }))
                  }
                  placeholder="Write the explanation"
                  onUploadImage={uploadEditorImage}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm block">
                  <span className="font-medium text-zinc-700">Difficulty</span>
                  <select
                    value={questionForm.difficulty}
                    onChange={(event) => setQuestionForm((current) => ({ ...current, difficulty: event.target.value as 'EASY' | 'MEDIUM' | 'HARD' }))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 pt-8">
                  <input
                    type="checkbox"
                    checked={questionForm.isPublished}
                    onChange={(event) => setQuestionForm((current) => ({ ...current, isPublished: event.target.checked }))}
                  />
                  Published
                </label>
              </div>

              <div className="space-y-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-900">Options</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionForm((current) => ({
                        ...current,
                        options: [
                          ...current.options,
                          { contentJson: emptyDocument, isCorrect: false, orderIndex: current.options.length },
                        ],
                      }))
                    }
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs"
                  >
                    Add option
                  </button>
                </div>
                {questionForm.options.map((option, index) => (
                  <div key={index} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-start">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Option content</label>
                        <RichTextEditor
                          value={option.contentJson}
                          onChange={({ json }) => {
                            const nextOptions = [...questionForm.options];
                            nextOptions[index] = { ...nextOptions[index], contentJson: json };
                            setQuestionForm((current) => ({ ...current, options: nextOptions }));
                          }}
                          onUploadImage={uploadEditorImage}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-zinc-700 pt-8">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(event) => setSingleCorrectOption(index, event.target.checked)}
                        />
                        Correct
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextOptions = questionForm.options.filter((_, optionIndex) => optionIndex !== index);
                          setQuestionForm((current) => ({
                            ...current,
                            options: nextOptions.map((nextOption, nextIndex) => ({ ...nextOption, orderIndex: nextIndex })),
                          }));
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Question preview</p>
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="space-y-4 text-sm leading-7 text-zinc-700">
                    <div dangerouslySetInnerHTML={{ __html: questionForm.promptHtml }} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {questionForm.options.map((option, index) => (
                      <div
                        key={index}
                        className={[
                          'rounded-2xl border px-4 py-3 text-sm',
                          option.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-zinc-200 bg-zinc-50 text-zinc-700',
                        ].join(' ')}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
                        <span>{option.isCorrect ? 'Correct answer' : 'Answer option'}</span>
                      </div>
                    ))}
                  </div>
                  {questionForm.explanationHtml ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Explanation</p>
                      <div className="mt-3 space-y-4 text-sm leading-7 text-zinc-700">
                        <div dangerouslySetInnerHTML={{ __html: questionForm.explanationHtml }} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <button className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white">
                {editingQuestionId ? 'Update question' : 'Create question'}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {visibleQuestions.map((question) => (
                <div key={question.id} className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">Question {question.id.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">
                        {question.level ?? 'No level'} · {question.questionType} · {question.difficulty ?? 'No difficulty'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(question.id);
                          setQuestionForm({
                            level: question.level ?? selectedLevel,
                            chapterId: question.chapterId ?? '',
                            subtopicId: question.subtopicId ?? '',
                            promptJson: question.promptJson,
                            promptHtml: '',
                            explanationJson: question.explanationJson ?? emptyDocument,
                            explanationHtml: '',
                            questionType: question.questionType,
                            difficulty: question.difficulty ?? 'MEDIUM',
                            isPublished: question.isPublished,
                            options: question.options.map((option, optionIndex) => ({
                              id: option.id,
                              contentJson: option.contentJson,
                              isCorrect: option.isCorrect,
                              orderIndex: optionIndex,
                            })),
                          });
                          setActiveSection('questions');
                        }}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('question', question.id)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-600">
              Editing context: {selectedChapter ? selectedChapter.title : 'No chapter selected'} /{' '}
              {selectedSubtopic ? selectedSubtopic.title : 'No subtopic selected'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">Level: {formatLevel(selectedLevel)}</span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">Visible questions: {visibleQuestions.length}</span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">Notes: {notes.length}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
