"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Note = {
  id: string;
  subtopicId: string;
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string | null;
  orderIndex: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

function extractTextFromRichJson(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const node = input as { text?: string; content?: unknown[] };
  const text = typeof node.text === 'string' ? node.text : '';
  const childText = Array.isArray(node.content)
    ? node.content.map((child) => extractTextFromRichJson(child)).filter(Boolean).join(' ')
    : '';
  return `${text} ${childText}`.trim();
}

export function UserNotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const subtopicId = params.get('subtopic');
      const chapterId = params.get('chapter');

      const searchParams = new URLSearchParams();
      if (subtopicId) searchParams.set('subtopicId', subtopicId);
      if (chapterId) searchParams.set('chapterId', chapterId);

      const response = await fetch(`/api/notes?${searchParams.toString()}`);
      const payload = await response.json() as ApiResponse<Note[]>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Failed to load notes');
      }

      const data = payload.data ?? [];
      setNotes(data);
      if (data.length > 0) {
        setSelectedNote(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Notes Center</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Study Materials</h1>
        </div>
        <Link href="/user" className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
          Back to Dashboard
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-500">Loading notes...</div>
      ) : error ? (
        <div className="py-12 text-center text-red-600">{error}</div>
      ) : notes.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">No notes available for this selection.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-500">Select Note</p>
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  selectedNote?.id === note.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {note.title}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            {selectedNote ? (
              <div className="prose prose-zinc max-w-none">
                <h2 className="text-xl font-semibold text-zinc-900">{selectedNote.title}</h2>
                <div
                  className="mt-4 text-zinc-700"
                  dangerouslySetInnerHTML={{
                    __html: selectedNote.contentHtml ?? extractTextFromRichJson(selectedNote.contentJson),
                  }}
                />
              </div>
            ) : (
              <p className="text-zinc-500">Select a note to view its content.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}