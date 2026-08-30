"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { Flag, AlertTriangle, List, X } from 'lucide-react';
import { sanitizeWatermarkConfig } from '@/lib/utils/watermark';
import { normalizeNoteHtml } from '@/lib/utils/note-html';

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
    // Deliberately NOT promoted to its own compositing layer. This element is
    // `inset-0` on the note card, so on a long chapter it is ~18000px tall —
    // past the 16384px max GPU texture size. A forced layer that big cannot be
    // held as one texture, so the compositor re-rasterises tiles of it while
    // scrolling, which is what read as images/text blinking. Painted normally,
    // a repeating background costs nothing on scroll.
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
  const [isLocked, setIsLocked] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState('learner');
  const [isObfuscated, setIsObfuscated] = useState(false);
  // Mirrors isObfuscated so the activity listeners can read it without being
  // a dependency — otherwise every toggle tore down and re-bound all of them.
  const isObfuscatedRef = useRef(false);
  useEffect(() => { isObfuscatedRef.current = isObfuscated; }, [isObfuscated]);
  const [readPct, setReadPct] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // Track reading progress on window scroll.
  // Throttled to one read per animation frame and only committed when the
  // rounded percentage actually changes — otherwise every scroll event
  // re-renders the whole note body (dangerouslySetInnerHTML) and the page
  // visibly flickers while scrolling.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 0;
      setReadPct(prev => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [selectedNote]);

  // Lightbox: close on Escape, and freeze the page behind it so scrolling the
  // overlay doesn't drag the note along underneath.
  useEffect(() => {
    if (!lightbox) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [lightbox]);

  // Note HTML is injected with dangerouslySetInnerHTML, so there are no React
  // nodes to attach handlers to — catch image clicks by delegation instead.
  const onNoteClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    const img = target as HTMLImageElement;
    // currentSrc resolves whatever the browser actually picked (AVIF/WebP).
    setLightbox({ src: img.currentSrc || img.src, alt: img.alt || 'Note figure' });
  }, []);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const subtopicId = params.get('subtopic');
      const chapterId = params.get('chapter');
      const noteId = params.get('note');

      const searchParams = new URLSearchParams();
      // Prefer chapter context so the reader can flow across subtopics (Prev/Next).
      if (chapterId) searchParams.set('chapterId', chapterId);
      else if (subtopicId) searchParams.set('subtopicId', subtopicId);
      if (noteId) searchParams.set('note', noteId);

      const response = await fetch(`/api/notes?${searchParams.toString()}`);
      const payload = await response.json() as ApiResponse<Note[]> & { _openNoteId?: string | null; locked?: boolean };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Failed to load notes');
      }

      if (payload.locked) {
        setIsLocked(true);
        setNotes([]);
        return;
      }

      setIsLocked(false);
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

    // Scrolling and wheel events count as activity. Reading a long note by
    // trackpad never moves the cursor, so without these the idle timer fired
    // mid-read and slammed the obfuscation overlay over the page — then the
    // next tiny mouse jiggle cleared it. That flip-flop is what looked like
    // the content flashing while scrolling.
    let idleTimer = 0;
    const bumpActivity = () => {
      // Read through a ref so this effect never re-subscribes on state change.
      if (isObfuscatedRef.current) setIsObfuscated(false);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIsObfuscated(true), 90_000);
    };

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'] as const;

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    for (const evt of activityEvents) {
      window.addEventListener(evt, bumpActivity, { passive: true });
    }
    bumpActivity();

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      for (const evt of activityEvents) {
        window.removeEventListener(evt, bumpActivity);
      }
    };
  }, []);

  const watermark = useMemo(() => sanitizeWatermarkConfig(selectedNote?.watermarkConfig), [selectedNote?.watermarkConfig]);
  const selectedNoteHtml = useMemo(() => {
    const html = selectedNote?.contentHtml ?? extractTextFromRichJson(selectedNote?.contentJson);
    return normalizeNoteHtml(html);
  }, [selectedNote]);

  const currentIndex = useMemo(() => notes.findIndex((n) => n.id === selectedNote?.id), [notes, selectedNote]);
  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= notes.length) return;
    setSelectedNote(notes[idx]);
    setShowReportForm(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [notes]);

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

  // Block print / save shortcuts (Cmd/Ctrl + P or S). The CSS @media print
  // rule is the real safeguard; this just gives instant feedback.
  useEffect(() => {
    const blockPrint = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && (key === 'p' || key === 's')) {
        e.preventDefault();
        setProtectionNotice('Printing and saving are disabled on protected notes.');
        window.setTimeout(() => setProtectionNotice(null), 1800);
      }
    };
    window.addEventListener('keydown', blockPrint);
    return () => window.removeEventListener('keydown', blockPrint);
  }, []);

  // Fire-and-forget: powers the onboarding checklist and trial-drip emails.
  // Never blocks or errors the reader if tracking fails.
  useEffect(() => {
    if (!selectedNote?.subtopicId) return;
    apiJson('/api/user/activity/note-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtopicId: selectedNote.subtopicId }),
    }).catch(() => {});
  }, [selectedNote?.subtopicId]);

  return (
    <>
      {/* Shown ONLY when the page is sent to a printer or "Save as PDF" */}
      <div className="note-print-guard">
        <div>
          <p className="text-lg font-semibold text-zinc-900">Printing is disabled</p>
          <p className="mt-2 max-w-md text-sm text-zinc-600">
            These study notes are protected content of Chartix.in and cannot be printed or saved as a PDF.
          </p>
        </div>
      </div>

      <div
        className="notes-protected-root"
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
        <div className="rounded-2xl border border-zinc-100 bg-white py-16 text-center">
          {isLocked ? (
            <>
              <p className="text-sm font-medium text-zinc-700">Your coupon does not have access to this note.</p>
              <p className="mt-1 text-xs text-zinc-400">Please contact support or upgrade your plan to unlock this content.</p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No notes available for this selection.</p>
          )}
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

          {/* Sticky reading header. Deliberately a sibling of the grid rather
              than a child of the note card — the card is `overflow-hidden` (to
              clip the watermark to its rounded corners) and any clipping
              ancestor silently kills `position: sticky`. */}
          {selectedNote && (
            <div className="sticky top-0 z-40 mb-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
              {/* Nav row: Library | Index | Note title */}
              <div className="flex items-center gap-1 border-b border-zinc-100 px-4 py-2.5 sm:px-5">
                <Link
                  href="/user"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  ← Library
                </Link>
                <span className="text-zinc-200">|</span>
                <button
                  type="button"
                  onClick={() => setShowIndex(v => !v)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${showIndex ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'}`}
                >
                  <List className="h-3.5 w-3.5" />
                  Index
                </button>
                <span className="text-zinc-200">|</span>
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-700">{selectedNote.title}</p>
              </div>
              {/* Progress bar row */}
              <div className="flex items-center gap-3 px-4 py-2 sm:px-5">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-emerald-600"
                    style={{ transform: `scaleX(${readPct / 100})` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-400">{readPct}% read</span>
              </div>
            </div>
          )}

          <div className={`grid min-w-0 gap-4 ${selectedNote && !showIndex ? 'lg:grid-cols-1' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}>
            {/* Sidebar — hidden on mobile when a note is selected; toggled by Index button */}
            <div className={`${selectedNote ? (showIndex ? 'block' : 'hidden lg:hidden') : 'block'} min-w-0 space-y-1.5`}>
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
                      onClick={onNoteClick}
                      dangerouslySetInnerHTML={{
                        __html: selectedNoteHtml,
                      }}
                    />
                  </div>
                </div>

                {notes.length > 1 && currentIndex >= 0 && (
                  <div className="relative z-20 mt-8 flex items-center justify-between gap-2 border-t border-zinc-200 pt-5">
                    <button
                      type="button"
                      onClick={() => goTo(currentIndex - 1)}
                      disabled={currentIndex <= 0}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>
                    <Link href="/user" className="hidden text-xs font-medium text-zinc-400 hover:text-emerald-700 sm:inline">
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => goTo(currentIndex + 1)}
                      disabled={currentIndex >= notes.length - 1}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                )}

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

      {/* Image lightbox. Rendered inside notes-protected-root so the existing
          right-click / copy / drag guards still apply to the enlarged image. */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/85 p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close image"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white transition hover:bg-white/20 sm:right-5 sm:top-5"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Stop clicks on the image itself from closing the overlay. */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain shadow-2xl"
          />

          <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/60">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}
      </div>
    </>
  );
}
