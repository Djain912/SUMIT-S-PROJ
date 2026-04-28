"use client";

import { useState, useEffect } from 'react';
import { AdminLevelTabs, type AdminLevel } from '@/components/admin/admin-level-tabs';
import { TinyMceEditor } from '@/components/admin/tinymce-editor';
import { DEFAULT_WATERMARK_CONFIG, sanitizeWatermarkConfig, type WatermarkConfig, type WatermarkPosition } from '@/lib/utils/watermark';

type Level = AdminLevel;

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

type Note = {
  id: string;
  subtopicId: string;
  title: string;
  contentHtml: string | null;
  watermarkConfig: unknown;
  orderIndex: number;
  isPublished: boolean;
};

const chaptersInFlight = new Map<Level, Promise<Chapter[]>>();
const notesInFlight = new Map<string, Promise<Note[]>>();

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

async function fetchNotes(subtopicId: string): Promise<Note[]> {
  const existing = notesInFlight.get(subtopicId);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const res = await fetch(`/api/admin/notes?subtopicId=${subtopicId}`);
    const data = await res.json();
    return data.data || [];
  })();

  notesInFlight.set(subtopicId, request);
  request.finally(() => {
    notesInFlight.delete(subtopicId);
  });

  return request;
}

async function saveNote(data: {
  subtopicId: string;
  title: string;
  contentHtml: string;
  orderIndex: number;
  isPublished: boolean;
  watermarkConfig: WatermarkConfig;
}) {
  const res = await fetch('/api/admin/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function updateNote(id: string, data: { title: string; contentHtml: string; isPublished: boolean; watermarkConfig: WatermarkConfig }) {
  const res = await fetch(`/api/admin/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteNote(id: string) {
  const res = await fetch(`/api/admin/notes/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export function AdminNotesClient({ initialLevel = 'LEVEL_1' }: { initialLevel?: Level }) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null); // Track if editing existing note
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(false);
  const [editWatermark, setEditWatermark] = useState<WatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChapters(level).then(setChapters);
  }, [level]);

  useEffect(() => {
    if (selectedSubtopic) {
      fetchNotes(selectedSubtopic).then(setNotes);
    }
  }, [selectedSubtopic]);

  useEffect(() => {
    setLevel(initialLevel);
    setSelectedChapter('');
    setSelectedSubtopic('');
    setNotes([]);
    setSelectedNote(null);
  }, [initialLevel]);

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  const handleSave = async () => {
    if (!selectedSubtopic || !editTitle) return;
    setSaving(true);
    try {
      let savedNote: Note | null = null;
      if (editingNoteId) {
        // Update existing note
        const result = await updateNote(editingNoteId, {
          title: editTitle,
          contentHtml: editContent,
          isPublished: editPublished,
          watermarkConfig: editWatermark,
        });
        savedNote = result.data ?? null;
      } else {
        // Create new note
        const result = await saveNote({
          subtopicId: selectedSubtopic,
          title: editTitle,
          contentHtml: editContent,
          orderIndex: notes.length,
          isPublished: editPublished,
          watermarkConfig: editWatermark,
        });
        savedNote = result.data ?? null;
      }
      notesInFlight.delete(selectedSubtopic);
      const refreshed = await fetchNotes(selectedSubtopic);
      setNotes(refreshed);
      if (savedNote) {
        setSelectedNote(savedNote);
      }
      setIsEditing(false);
      setEditingNoteId(null);
      if (!savedNote) {
        setEditTitle('');
        setEditContent('');
        setEditPublished(false);
        setEditWatermark(DEFAULT_WATERMARK_CONFIG);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{level.replace('_', ' ').replace('LEVEL', 'Level')}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Study Notes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Create concise learning material for each subtopic in the curriculum.
          </p>
        </div>
        <AdminLevelTabs
          selectedLevel={level}
          onLevelChange={(nextLevel) => {
            setLevel(nextLevel);
            setSelectedChapter('');
            setSelectedSubtopic('');
            setNotes([]);
            setSelectedNote(null);
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
                setNotes([]);
                setSelectedNote(null);
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

          {notes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Notes ({notes.length})</label>
              <div className="mt-1 space-y-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setEditTitle(note.title);
                      setEditContent(note.contentHtml || '');
                      setEditPublished(note.isPublished);
                      setEditWatermark(sanitizeWatermarkConfig(note.watermarkConfig));
                      setIsEditing(false);
                      setEditingNoteId(null);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedNote?.id === note.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {note.title}
                    {note.isPublished && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                        Published
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {!selectedSubtopic ? (
            <p className="text-center text-zinc-500">
              Select a chapter and subtopic to view or create notes
            </p>
          ) : isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Note title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Content</label>
                <TinyMceEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Write your note content..."
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
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-800">Watermark Protection</p>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={editWatermark.enabled}
                    onChange={(e) => setEditWatermark((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-zinc-300"
                  />
                  Enable watermark for this note
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Text</label>
                    <input
                      value={editWatermark.text}
                      onChange={(e) => setEditWatermark((prev) => ({ ...prev, text: e.target.value.slice(0, 120) }))}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="Confidential"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Position</label>
                    <select
                      value={editWatermark.position}
                      onChange={(e) =>
                        setEditWatermark((prev) => ({ ...prev, position: e.target.value as WatermarkPosition }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="TILE">Tile (background)</option>
                      <option value="CENTER">Center</option>
                      <option value="TOP_LEFT">Top left</option>
                      <option value="TOP_RIGHT">Top right</option>
                      <option value="BOTTOM_LEFT">Bottom left</option>
                      <option value="BOTTOM_RIGHT">Bottom right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Opacity</label>
                    <input
                      type="range"
                      min={0.05}
                      max={0.4}
                      step={0.01}
                      value={editWatermark.opacity}
                      onChange={(e) => setEditWatermark((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
                      className="mt-2 w-full"
                    />
                    <p className="mt-1 text-xs text-zinc-500">{Math.round(editWatermark.opacity * 100)}%</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Font Size</label>
                    <input
                      type="number"
                      min={12}
                      max={40}
                      value={editWatermark.fontSize}
                      onChange={(e) => setEditWatermark((prev) => ({ ...prev, fontSize: Number(e.target.value) || 18 }))}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Color</label>
                    <input
                      type="color"
                      value={editWatermark.color.slice(0, 7)}
                      onChange={(e) => setEditWatermark((prev) => ({ ...prev, color: `${e.target.value}80` }))}
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingNoteId(null);
                    setEditTitle('');
                    setEditContent('');
                    setEditPublished(false);
                    setEditWatermark(DEFAULT_WATERMARK_CONFIG);
                  }}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          ) : !selectedNote ? (
            <div className="space-y-4">
              <p className="text-zinc-700">No notes for this subtopic yet</p>
              <button
                onClick={() => {
                  setEditTitle('');
                  setEditContent('');
                  setEditPublished(false);
                  setEditWatermark(DEFAULT_WATERMARK_CONFIG);
                  setIsEditing(true);
                  setEditingNoteId(null);
                }}
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900">{selectedNote.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditTitle(selectedNote.title);
                      setEditContent(selectedNote.contentHtml || '');
                      setEditPublished(selectedNote.isPublished);
                      setEditWatermark(sanitizeWatermarkConfig(selectedNote.watermarkConfig));
                      setIsEditing(true);
                      setEditingNoteId(selectedNote.id);
                    }}
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this note?')) return;
                      await deleteNote(selectedNote.id);
                      notesInFlight.delete(selectedSubtopic);
                      fetchNotes(selectedSubtopic).then(setNotes);
                      setSelectedNote(null);
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div
                className="prose prose-zinc max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNote.contentHtml || '' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
