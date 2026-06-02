"use client";

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import { Flag, AlertTriangle } from 'lucide-react';
import { sanitizeWatermarkConfig } from '@/lib/utils/watermark';

type Note = {
  id: string;
  subtopicId: string;
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string | null;
  watermarkConfig: unknown;
  orderIndex: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

type SessionPayload = {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isPremium: boolean;
};

function createWatermarkTileStyle(text: string, fontSize: number): CSSProperties {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260"><g transform="translate(40,140) rotate(-22)"><text x="0" y="0" font-size="${fontSize}" fill="currentColor" font-family="Arial, sans-serif">${escapedText}</text></g></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '420px 260px',
  };
}

function extractTextFromRichJson(input: unknown): string {
  if (!input) return '';

  if (typeof input === 'string') {
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (typeof input !== 'object') return '';

  const node = input as { text?: string; content?: unknown[]; html?: string };
  const htmlText = typeof node.html === 'string' ? node.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const text = typeof node.text === 'string' ? node.text : htmlText;
  const childText = Array.isArray(node.content)
    ? node.content.map((child) => extractTextFromRichJson(child)).filter(Boolean).join(' ')
    : '';
  return `${text} ${childText}`.trim();
}

function normalizeNoteHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const longToken = /(\S{28})(?=\S)/g;
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((node) => {
    node.nodeValue = node.nodeValue?.replace(longToken, '$1\u200B') ?? '';
  });

  doc.body.querySelectorAll('table').forEach((table) => {
    const htmlTable = table as HTMLTableElement;
    htmlTable.style.borderCollapse = 'collapse';
    htmlTable.style.borderSpacing = '0';
    htmlTable.style.border = '1px solid #d4d4d8';
    htmlTable.style.width = '100%';
    htmlTable.style.tableLayout = 'auto';
    // Remove fixed width/height attributes that cause narrow columns
    htmlTable.removeAttribute('width');
    htmlTable.removeAttribute('height');
  });

  // Strip width from col/colgroup so browser calculates widths naturally
  doc.body.querySelectorAll('col, colgroup').forEach((col) => {
    (col as HTMLElement).removeAttribute('width');
    (col as HTMLElement).style.width = 'auto';
  });

  doc.body.querySelectorAll('th, td').forEach((cell) => {
    const htmlCell = cell as HTMLTableCellElement;
    htmlCell.style.border = '1px solid #d4d4d8';
    htmlCell.style.padding = '0.75rem';
    // Remove any fixed width — this is the main cause of word-breaking
    htmlCell.style.width = 'auto';
    htmlCell.style.minWidth = '160px';
    htmlCell.style.maxWidth = 'none';
    htmlCell.style.wordBreak = 'normal';
    htmlCell.style.overflowWrap = 'break-word';
    htmlCell.style.whiteSpace = 'normal';
    htmlCell.removeAttribute('width');
  });

  return doc.body.innerHTML;
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  return response.json() as Promise<T>;
}

export function UserNotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState('learner');
  const [isObfuscated, setIsObfuscated] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const subtopicId = params.get('subtopic');
      const chapterId = params.get('chapter');
      const noteId = params.get('note');

      const searchParams = new URLSearchParams();
      if (subtopicId) searchParams.set('subtopicId', subtopicId);
      else if (chapterId) searchParams.set('chapterId', chapterId);
      else if (noteId) searchParams.set('note', noteId);

      const response = await fetch(`/api/notes?${searchParams.toString()}`);
      const payload = await response.json() as ApiResponse<Note[]> & { _openNoteId?: string | null };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Failed to load notes');
      }

      const data = payload.data ?? [];
      setNotes(data);
      if (data.length > 0) {
        const target = payload._openNoteId
          ? (data.find(n => n.id === payload._openNoteId) ?? data[0])
          : data[0];
        setSelectedNote(target);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const payload = await apiJson<ApiResponse<SessionPayload>>('/api/me');
        if (payload.success && payload.data?.email) {
          setSessionEmail(payload.data.email);
        }
      } catch {
        // Keep fallback identity when session endpoint is unavailable.
      }
    };

    void loadSession();
  }, []);

  useEffect(() => {
    const restrictedKeys = new Set(['F12', 'PrintScreen']);

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCombo =
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && ['u', 's'].includes(key));

      if (restrictedKeys.has(event.key) || blockedCombo) {
        event.preventDefault();
        setProtectionNotice('Protected content mode: inspect/copy shortcuts are restricted on this page.');
        window.setTimeout(() => setProtectionNotice(null), 2000);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsObfuscated(true);
      }
    };

    let idleTimer: number;
    const bumpActivity = () => {
      if (isObfuscated) {
        setIsObfuscated(false);
      }
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIsObfuscated(true), 90_000);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('mousemove', bumpActivity);
    window.addEventListener('keydown', bumpActivity);
    window.addEventListener('touchstart', bumpActivity);
    bumpActivity();

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('mousemove', bumpActivity);
      window.removeEventListener('keydown', bumpActivity);
      window.removeEventListener('touchstart', bumpActivity);
    };
  }, [isObfuscated]);

  const watermark = useMemo(() => sanitizeWatermarkConfig(selectedNote?.watermarkConfig), [selectedNote?.watermarkConfig]);
  const selectedNoteHtml = useMemo(() => {
    const html = selectedNote?.contentHtml ?? extractTextFromRichJson(selectedNote?.contentJson);
    return normalizeNoteHtml(html);
  }, [selectedNote]);

  const watermarkIdentity = useMemo(() => {
    const stamp = new Date().toLocaleDateString();
    return `${watermark.text} • ${sessionEmail} • ${stamp}`;
  }, [sessionEmail, watermark.text]);

  const watermarkPositionClass = useMemo(() => {
    switch (watermark.position) {
      case 'CENTER':
        return 'items-center justify-center';
      case 'TOP_LEFT':
        return 'items-start justify-start p-6';
      case 'TOP_RIGHT':
        return 'items-start justify-end p-6';
      case 'BOTTOM_LEFT':
        return 'items-end justify-start p-6';
      case 'BOTTOM_RIGHT':
        return 'items-end justify-end p-6';
      default:
        return 'items-center justify-center';
    }
  }, [watermark.position]);

  const handleReportNote = useCallback(async () => {
    if (!selectedNote || !reportReason.trim()) return;
    
    setIsReporting(true);
    setReportError(null);
    setReportSuccess(false);
    
    try {
      await apiJson(`/api/user/notes/${selectedNote.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason.trim() }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      setReportSuccess(true);
      setReportReason('');
      setShowReportForm(false);
      setTimeout(() => setReportSuccess(false), 3000);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to report note');
    } finally {
      setIsReporting(false);
    }
  }, [selectedNote, reportReason]);

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); setProtectionNotice('Right-click is restricted.'); window.setTimeout(() => setProtectionNotice(null), 1500); }}
      onCopy={(e) => { e.preventDefault(); setProtectionNotice('Copy is disabled on protected notes.'); window.setTimeout(() => setProtectionNotice(null), 1500); }}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {reportSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Note reported successfully. Thank you!
        </div>
      )}
      {protectionNotice && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {protectionNotice}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] animate-pulse">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-zinc-100" />)}
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-6">
            <div className="h-6 w-1/2 rounded-lg bg-zinc-200" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`h-4 rounded bg-zinc-100 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />)}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-zinc-100 bg-white py-16 text-center text-sm text-rose-600">{error}</div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white py-16 text-center text-sm text-zinc-500">
          No notes available for this selection.
          <div className="mt-4"><Link href="/user" className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">Back to Dashboard</Link></div>
        </div>
      ) : (
        <>
          {/* Mobile: show back button when reading */}
          {selectedNote && (
            <button type="button" onClick={() => setSelectedNote(null)}
              className="mb-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-800 lg:hidden">
              ← All notes
            </button>
          )}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Sidebar — hidden on mobile when a note is selected */}
            <div className={`${selectedNote ? 'hidden lg:block' : 'block'} min-w-0 space-y-1.5`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
              {notes.map((note) => (
                <button key={note.id} onClick={() => setSelectedNote(note)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    selectedNote?.id === note.id
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-zinc-100 bg-white text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50'
                  }`}>
                  {note.title}
                </button>
              ))}
            </div>

          <div className={`${selectedNote ? 'block' : 'hidden lg:block'} relative min-w-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6`}>
            {selectedNote ? (
              <>
                {watermark.enabled && watermark.position === 'TILE' && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      ...createWatermarkTileStyle(watermarkIdentity, watermark.fontSize),
                      color: watermark.color,
                      opacity: watermark.opacity,
                    }}
                  />
                )}

                {watermark.enabled && watermark.position !== 'TILE' && (
                  <div className={`pointer-events-none absolute inset-0 z-10 flex ${watermarkPositionClass}`}>
                    <p
                      className="rotate-[-16deg] select-none whitespace-nowrap font-semibold tracking-wide"
                      style={{
                        color: watermark.color,
                        opacity: watermark.opacity,
                        fontSize: `${watermark.fontSize}px`,
                      }}
                    >
                      {watermarkIdentity}
                    </p>
                  </div>
                )}

                {isObfuscated && (
                  <button
                    type="button"
                    onClick={() => setIsObfuscated(false)}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/70 p-6 text-center text-sm font-medium text-white"
                  >
                    Protected content paused after inactivity or tab switch. Click to resume viewing.
                  </button>
                )}

                <div className="flex min-w-0 items-start justify-between">
                  <div className="prose prose-zinc protected-content relative z-20 min-w-0 w-full max-w-none flex-1">
                    <h2 className="text-xl font-semibold text-zinc-900 break-words">{selectedNote.title}</h2>
                    <div
                      className="note-content mt-4 max-w-full overflow-x-auto text-zinc-700"
                      dangerouslySetInnerHTML={{
                        __html: selectedNoteHtml,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 border-t border-zinc-200 pt-4">
                  {!showReportForm ? (
                    <button
                      type="button"
                      onClick={() => setShowReportForm(true)}
                      className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                    >
                      <Flag className="h-4 w-4" />
                      Report this note
                    </button>
                  ) : (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-900">Report this note</p>
                      </div>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Describe what is wrong in this note (max 1000 characters)"
                        maxLength={1000}
                        className="w-full rounded-lg border border-orange-300 p-2 text-sm resize-none"
                        rows={3}
                      />
                      {reportError && <p className="mt-2 text-sm text-red-600">{reportError}</p>}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={handleReportNote}
                          disabled={!reportReason.trim() || isReporting}
                          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-orange-700"
                        >
                          {isReporting ? 'Reporting...' : 'Submit report'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReportForm(false);
                            setReportReason('');
                            setReportError(null);
                          }}
                          className="rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white">
                <p className="text-sm text-zinc-400">Select a note from the list to start reading.</p>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
