"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeNoteHtml } from '@/lib/utils/note-html';
import { AdminLevelTabs, type AdminLevel } from '@/components/admin/admin-level-tabs';
import { TinyMceEditor } from '@/components/admin/tinymce-editor';
import { DEFAULT_WATERMARK_CONFIG, sanitizeWatermarkConfig, type WatermarkConfig, type WatermarkPosition } from '@/lib/utils/watermark';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

type AutoSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

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

async function saveOrUpdateNote(id: string | null, data: Record<string, unknown>) {
  const method = id ? 'PATCH' : 'POST';
  const url = id ? `/api/admin/notes/${id}` : '/api/admin/notes';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

function NotePreview({ html }: { html: string }) {
  const clean = useMemo(() => normalizeNoteHtml(html), [html]);
  return (
    <div
      className="prose prose-zinc w-full max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function AdminNotesClient({ initialLevel = 'LEVEL_1' }: { initialLevel?: Level }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>(initialLevel);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null); // Track if editing existing note
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState(''); // used only as initialValue for TinyMCE
  const editorContentRef = useRef('');              // tracks live content — no re-renders
  const [editPublished, setEditPublished] = useState(false);
  const [editWatermark, setEditWatermark] = useState<WatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [saving, setSaving] = useState(false);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the note ID created during auto-save (for new notes not yet manually saved)
  const autoSavedNoteId = useRef<string | null>(null);

  useEffect(() => {
    fetchChapters(level).then(setChapters);
  }, [level]);

  useEffect(() => {
    if (selectedSubtopic) {
      fetchNotes(selectedSubtopic).then(setNotes);
    }
  }, [selectedSubtopic]);

  // Helper: set both the initialValue state and the live ref together
  function loadContent(html: string) {
    setEditContent(html);
    editorContentRef.current = html;
  }

  useEffect(() => {
    setLevel(initialLevel);
    setSelectedChapter('');
    setSelectedSubtopic('');
    setNotes([]);
    setSelectedNote(null);
  }, [initialLevel]);

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  // ── Auto-save function (always saves as draft/unpublished) ────────────────
  const performAutoSave = useCallback(async () => {
    if (!selectedSubtopic || !editTitle.trim()) return;
    const currentHtml = editorContentRef.current;

    setAutoSaveStatus('saving');
    try {
      const noteId = editingNoteId ?? autoSavedNoteId.current;

      if (noteId) {
        // Update existing note
        const res = await fetch(`/api/admin/notes/${noteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editTitle.trim(),
            contentHtml: currentHtml,
            isPublished: false, // always draft on auto-save
            watermarkConfig: editWatermark,
          }),
        });
        const result = await res.json();
        if (result.data) {
          const saved: Note = result.data;
          setNotes(prev => prev.map(n => n.id === noteId ? saved : n));
          if (!editingNoteId) setSelectedNote(saved);
        }
      } else {
        // Create new note for the first time
        const res = await fetch('/api/admin/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtopicId: selectedSubtopic,
            title: editTitle.trim(),
            contentHtml: currentHtml,
            orderIndex: notes.length,
            isPublished: false,
            watermarkConfig: editWatermark,
          }),
        });
        const result = await res.json();
        if (result.data) {
          const saved: Note = result.data;
          autoSavedNoteId.current = saved.id;
          setNotes(prev => {
            const exists = prev.find(n => n.id === saved.id);
            return exists ? prev.map(n => n.id === saved.id ? saved : n) : [...prev, saved];
          });
          setSelectedNote(saved);
        }
      }

      setAutoSaveStatus('saved');
      setAutoSavedAt(new Date());
      notesInFlight.delete(selectedSubtopic);
    } catch {
      setAutoSaveStatus('error');
    }
  }, [selectedSubtopic, editTitle, editingNoteId, editWatermark, notes.length]);

  // Trigger debounced auto-save when title or content changes
  const scheduleAutoSave = useCallback(() => {
    if (!isEditing) return;
    setAutoSaveStatus('dirty');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void performAutoSave();
    }, 3000); // 3 seconds after last change
  }, [isEditing, performAutoSave]);

  // Warn user if they try to close tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveStatus]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // Reset auto-save state when switching notes or closing editor
  const resetAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('idle');
    setAutoSavedAt(null);
    autoSavedNoteId.current = null;
  };

  const handleSave = async () => {
    if (!selectedSubtopic || !editTitle) return;
    setSaving(true);
    // Cancel any pending auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    try {
      const currentHtml = editorContentRef.current;
      // Use auto-saved note ID if available (note was created by auto-save)
      const noteId = editingNoteId ?? autoSavedNoteId.current;

      if (noteId) {
        const result = await updateNote(noteId, {
          title: editTitle,
          contentHtml: currentHtml,
          isPublished: editPublished,
          watermarkConfig: editWatermark,
        });
        const saved: Note = result.data;
        setNotes(prev => prev.map(n => (n.id === noteId ? saved : n)));
        setSelectedNote(saved);
      } else {
        const result = await saveOrUpdateNote(null, {
          subtopicId: selectedSubtopic,
          title: editTitle,
          contentHtml: currentHtml,
          orderIndex: notes.length,
          isPublished: editPublished,
          watermarkConfig: editWatermark,
        });
        const saved: Note = result.data;
        setNotes(prev => [...prev, saved]);
        setSelectedNote(saved);
      }
      notesInFlight.delete(selectedSubtopic);
      resetAutoSave();
      setIsEditing(false);
      setEditingNoteId(null);
      router.refresh();
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

          {selectedSubtopic && (
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-700">
                  Notes {notes.length > 0 ? `(${notes.length})` : ''}
                </label>
                <button
                  onClick={() => {
                    setSelectedNote(null);
                    setEditTitle('');
                    loadContent('');
                    setEditPublished(false);
                    setEditWatermark(DEFAULT_WATERMARK_CONFIG);
                    setIsEditing(true);
                    setEditingNoteId(null);
                  }}
                  className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                >
                  + New Note
                </button>
              </div>
              {notes.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setSelectedNote(note);
                        setEditTitle(note.title);
                        loadContent(note.contentHtml || '');
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
                      <span className="block truncate">{note.title}</span>
                      <span className="mt-0.5 block">
                        {note.isPublished ? (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                            Published
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                            Draft
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-400">No notes yet — click + New Note to create one.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {!selectedSubtopic ? (
            <p className="text-center text-zinc-500">
              Select a chapter and subtopic to view or create notes
            </p>
          ) : !isEditing && !selectedNote ? (
            <p className="text-center text-zinc-400 text-sm">
              Select a note from the list or click <span className="font-semibold text-zinc-600">+ New Note</span> to create one.
            </p>
          ) : isEditing ? (
            <div className="space-y-4">

              {/* Auto-save status bar */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  {autoSaveStatus === 'idle' && (
                    <span className="text-zinc-400">Auto-save active — changes save automatically as draft</span>
                  )}
                  {autoSaveStatus === 'dirty' && (
                    <><Clock className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-600 font-medium">Unsaved changes…</span></>
                  )}
                  {autoSaveStatus === 'saving' && (
                    <><Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" /><span className="text-blue-600 font-medium">Auto-saving…</span></>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600 font-medium">Draft auto-saved{autoSavedAt ? ` at ${autoSavedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></>
                  )}
                  {autoSaveStatus === 'error' && (
                    <><AlertCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-red-600 font-medium">Auto-save failed — please save manually</span></>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void performAutoSave()}
                  disabled={autoSaveStatus === 'saving' || !editTitle.trim()}
                  className="text-[11px] text-zinc-400 hover:text-zinc-700 transition disabled:opacity-40"
                >
                  Save now
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); scheduleAutoSave(); }}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Note title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Content</label>
                {/* key forces a full remount when switching notes so initialValue is fresh */}
                <TinyMceEditor
                  key={editingNoteId ?? 'new-note'}
                  initialValue={editContent}
                  onChange={(val) => { editorContentRef.current = val; scheduleAutoSave(); }}
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
                    loadContent('');
                    setEditPublished(false);
                    setEditWatermark(DEFAULT_WATERMARK_CONFIG);
                    resetAutoSave();
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
          ) : selectedNote ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900">{selectedNote.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditTitle(selectedNote.title);
                      loadContent(selectedNote.contentHtml || '');
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
                      notesInFlight.delete(selectedNote.subtopicId);
                      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
                      setSelectedNote(null);
                      router.refresh();
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <NotePreview html={selectedNote.contentHtml || ''} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
