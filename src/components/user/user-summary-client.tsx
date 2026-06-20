'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Lightbulb, FlaskConical, BookOpen, AlertCircle, Brain, Zap, Timer, Eye, Star, LayoutList } from 'lucide-react';
import { type ChapterSummaryContent, type KeyConcept, type Formula, type ExamTip, type SummaryItemType } from '@/lib/chapter-summary/types';
import { LogoLoader } from '@/components/shared/logo-loader';

type BookmarkKey = { itemType: string; itemIndex: number };
type Summary = ChapterSummaryContent & { chapterId: string; isPublished: boolean };
type Chapter = { id: string; title: string };

type ResolvedItem = {
  itemType: SummaryItemType;
  itemIndex: number;
  text?: string;
  concept?: KeyConcept;
  formula?: Formula;
  tip?: ExamTip;
};
type BookmarkGroup = { chapterId: string; chapterTitle: string; items: ResolvedItem[] };

// Tiled, rotated watermark used as a TOP overlay (visible above the content cards).
function createWatermarkStyle(text: string): CSSProperties {
  const safe = text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><g transform="translate(20,120) rotate(-24)"><text x="0" y="0" font-size="15" font-weight="600" fill="rgba(15,118,90,0.18)" font-family="Arial,sans-serif">${safe}</text></g></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '360px 200px',
  };
}

function BookmarkBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={on ? 'Remove bookmark' : 'Bookmark this'}
      className={`ml-auto flex-none rounded-md p-1.5 transition-colors ${on ? 'text-emerald-600 hover:text-emerald-700' : 'text-zinc-300 hover:text-zinc-500'}`}>
      {on ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

function Section({ title, icon, color, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-zinc-50">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>{icon}</span>
        <span className="text-sm font-bold text-zinc-900">{title}</span>
        <span className="ml-auto text-zinc-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
      </button>
      {open && <div className="border-t border-zinc-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

// ── Shared item renderers (used by both browse + bookmarks views) ──
function TextItem({ text, n, on, onToggle, tone }: { text: string; n?: number; on: boolean; onToggle: () => void; tone: 'emerald' | 'rose' }) {
  const ring = tone === 'emerald' ? 'border-zinc-100 bg-zinc-50/60 hover:bg-emerald-50/40' : 'border-rose-100 bg-rose-50/30';
  return (
    <li className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${ring}`}>
      {n != null
        ? <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{n}</span>
        : <span className="mt-1 flex-none text-rose-400">▸</span>}
      <span className="flex-1 text-sm leading-relaxed text-zinc-700">{text}</span>
      <BookmarkBtn on={on} onClick={onToggle} />
    </li>
  );
}
function ConceptItem({ c, on, onToggle }: { c: KeyConcept; on: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/30 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-sm font-bold text-sky-900">{c.name}</p>
          {c.definition && <p className="mt-1 text-sm leading-relaxed text-zinc-700">{c.definition}</p>}
          {c.whyItMatters && <p className="mt-1.5 text-xs leading-relaxed text-zinc-500"><span className="font-semibold text-zinc-600">Why it matters:</span> {c.whyItMatters}</p>}
          {c.examAngle && <p className="mt-1 text-xs leading-relaxed text-amber-700"><span className="font-semibold">Exam angle:</span> {c.examAngle}</p>}
        </div>
        <BookmarkBtn on={on} onClick={onToggle} />
      </div>
    </div>
  );
}
function FormulaItem({ f, on, onToggle }: { f: Formula; on: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/30 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">{f.label}</p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-zinc-800">{f.expression}</p>
          {f.notes && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.notes}</p>}
        </div>
        <BookmarkBtn on={on} onClick={onToggle} />
      </div>
    </div>
  );
}
function TipItem({ t, on, onToggle }: { t: ExamTip; on: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1.5">
          {t.remember && <p className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700"><span className="flex-none">✅</span><span>{t.remember}</span></p>}
          {t.mistake && <p className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700"><span className="flex-none">❌</span><span>{t.mistake}</span></p>}
        </div>
        <BookmarkBtn on={on} onClick={onToggle} />
      </div>
    </div>
  );
}

export function UserSummaryClient({ userEmail }: { userEmail: string }) {
  const [mode, setMode] = useState<'browse' | 'bookmarks'>('browse');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkKey[]>([]);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [isObfuscated, setIsObfuscated] = useState(false);

  // Global bookmarks view
  const [groups, setGroups] = useState<BookmarkGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const watermarkStyle = createWatermarkStyle(`Chartix • ${userEmail} • ${new Date().toLocaleDateString()}`);

  // Copy / screenshot / inspect deterrents (mirrors the protected Notes page).
  useEffect(() => {
    const restrictedKeys = new Set(['F12', 'PrintScreen']);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCombo =
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && ['u', 's', 'p'].includes(key)) ||
        (event.metaKey && ['s', 'p'].includes(key));
      if (restrictedKeys.has(event.key) || blockedCombo) {
        event.preventDefault();
        setProtectionNotice('Protected content: copy / print / inspect shortcuts are disabled here.');
        window.setTimeout(() => setProtectionNotice(null), 2000);
      }
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') setIsObfuscated(true); };
    let idleTimer: number;
    const bumpActivity = () => {
      setIsObfuscated(false);
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
  }, []);

  useEffect(() => {
    fetch('/api/user/dashboard?level=LEVEL_1')
      .then(r => r.json())
      .then((d: { success: boolean; data?: { sections: { chapters: Chapter[] }[] } }) => {
        if (d.success && d.data) {
          const chs = d.data.sections.flatMap(s => s.chapters);
          setChapters(chs);
          if (chs.length > 0) setSelectedId(chs[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(async (chapterId: string) => {
    if (!chapterId) return;
    setLoading(true); setError(''); setSummary(null); setBookmarks([]);
    try {
      const [sRes, bRes] = await Promise.all([
        fetch(`/api/chapter-summary/${chapterId}`),
        fetch(`/api/chapter-summary/${chapterId}/bookmark`),
      ]);
      const sData = await sRes.json() as { success: boolean; data: Summary | null };
      const bData = await bRes.json() as { success: boolean; data: BookmarkKey[] };
      if (sData.success) setSummary(sData.data);
      if (bData.success) setBookmarks(bData.data);
    } catch {
      setError('Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (mode === 'browse' && selectedId) loadSummary(selectedId); }, [mode, selectedId, loadSummary]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true); setError('');
    try {
      const res = await fetch('/api/user/summary-bookmarks');
      const data = await res.json() as { success: boolean; data: BookmarkGroup[] };
      if (data.success) setGroups(data.data);
    } catch {
      setError('Failed to load bookmarks.');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => { if (mode === 'bookmarks') loadGroups(); }, [mode, loadGroups]);

  const isBookmarked = (t: SummaryItemType, i: number) => bookmarks.some(b => b.itemType === t && b.itemIndex === i);

  // Toggle in browse mode (uses current chapter)
  const toggle = async (itemType: SummaryItemType, itemIndex: number) => {
    const res = await fetch(`/api/chapter-summary/${selectedId}/bookmark`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemIndex }),
    });
    const data = await res.json() as { success: boolean; data: { bookmarked: boolean } };
    if (data.success) {
      setBookmarks(prev => data.data.bookmarked
        ? [...prev, { itemType, itemIndex }]
        : prev.filter(b => !(b.itemType === itemType && b.itemIndex === itemIndex)));
    }
  };

  // Remove a bookmark from the global view
  const removeFromGroup = async (chapterId: string, itemType: SummaryItemType, itemIndex: number) => {
    await fetch(`/api/chapter-summary/${chapterId}/bookmark`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemIndex }),
    });
    setGroups(prev => prev
      .map(g => g.chapterId === chapterId
        ? { ...g, items: g.items.filter(it => !(it.itemType === itemType && it.itemIndex === itemIndex)) }
        : g)
      .filter(g => g.items.length > 0));
  };

  const selectedChapter = chapters.find(c => c.id === selectedId);
  const hasContent = summary && (summary.summary.length || summary.keyConcepts.length || summary.formulas.length || summary.examTips.length || summary.highYield.length || summary.oneMinute.length);

  // Apply "bookmarked only" filter for browse mode
  const show = (t: SummaryItemType, i: number) => !onlyBookmarked || isBookmarked(t, i);
  const totalBookmarksInChapter = bookmarks.length;

  const ModeToggle = (
    <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
      <button type="button" onClick={() => setMode('browse')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mode === 'browse' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
        <LayoutList className="h-3.5 w-3.5" /> Browse Chapters
      </button>
      <button type="button" onClick={() => setMode('bookmarks')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${mode === 'bookmarks' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
        <Star className="h-3.5 w-3.5" /> My Bookmarks
      </button>
    </div>
  );

  return (
    <>
      {/* Shown ONLY when the page is sent to a printer or "Save as PDF" */}
      <div className="note-print-guard">
        <div>
          <p className="text-lg font-semibold text-zinc-900">Printing is disabled</p>
          <p className="mt-2 max-w-md text-sm text-zinc-600">
            These revision sheets are protected content of Chartix.in and cannot be printed or saved as a PDF.
          </p>
        </div>
      </div>

      <div
        className="notes-protected-root flex flex-col gap-6"
        onContextMenu={(e) => { e.preventDefault(); setProtectionNotice('Right-click is restricted on protected content.'); window.setTimeout(() => setProtectionNotice(null), 1500); }}
        onCopy={(e) => { e.preventDefault(); setProtectionNotice('Copy is disabled on protected content.'); window.setTimeout(() => setProtectionNotice(null), 1500); }}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
      {protectionNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{protectionNotice}</div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-3">{ModeToggle}</div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 flex-none" /> {error}
        </div>
      )}

      {/* ════════ BROWSE MODE ════════ */}
      {mode === 'browse' && (
        <>
          {/* Chapter selector + filter */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Select Chapter</p>
              <button type="button" onClick={() => setOnlyBookmarked(v => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${onlyBookmarked ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                <Star className={`h-3 w-3 ${onlyBookmarked ? 'fill-white' : ''}`} />
                {onlyBookmarked ? 'Bookmarked only' : 'All items'}
              </button>
            </div>
            <div className="relative p-4">
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-zinc-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-zinc-200 bg-white py-16 shadow-sm">
              <LogoLoader text="Loading revision sheet…" />
            </div>
          )}

          {!loading && summary && !summary.isPublished && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 flex-none" /> Revision sheet for this chapter is being prepared. Check back soon!
            </div>
          )}

          {!loading && summary?.isPublished && hasContent && onlyBookmarked && totalBookmarksInChapter === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
              <Star className="h-7 w-7 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-500">No bookmarks in this chapter yet.</p>
              <p className="text-xs text-zinc-400">Tap the bookmark icon on any item to save it here.</p>
            </div>
          )}

          {!loading && summary?.isPublished && hasContent && (
            <div className="relative">
              {isObfuscated && (
                <button type="button" onClick={() => setIsObfuscated(false)}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 backdrop-blur-md">
                  <Eye className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-semibold text-zinc-700">Content hidden — click to resume</span>
                </button>
              )}
              <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={watermarkStyle} />

              <div className={`relative z-0 space-y-4 select-none ${isObfuscated ? 'blur-md' : ''}`}>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Quick Revision Sheet</p>
                  <h2 className="mt-1 text-lg font-bold text-emerald-900">{selectedChapter?.title}</h2>
                  <p className="mt-1 text-xs text-emerald-600/70">Everything that matters most — readable in 5-10 minutes.</p>
                </div>

                {/* Chapter Summary */}
                {summary.summary.some((_, i) => show('summary', i)) && (
                  <Section title="Chapter Summary" icon={<BookOpen className="h-4 w-4 text-white" />} color="bg-emerald-600">
                    <ul className="space-y-2">
                      {summary.summary.map((pt, i) => show('summary', i) && (
                        <TextItem key={i} text={pt} n={i + 1} tone="emerald" on={isBookmarked('summary', i)} onToggle={() => toggle('summary', i)} />
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Key Concepts */}
                {summary.keyConcepts.some((_, i) => show('keyConcept', i)) && (
                  <Section title="Key Concepts to Remember" icon={<Brain className="h-4 w-4 text-white" />} color="bg-sky-600">
                    <div className="space-y-3">
                      {summary.keyConcepts.map((c, i) => show('keyConcept', i) && (
                        <ConceptItem key={i} c={c} on={isBookmarked('keyConcept', i)} onToggle={() => toggle('keyConcept', i)} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Formulas */}
                {summary.formulas.some((_, i) => show('formula', i)) && (
                  <Section title="Important Formulas" icon={<FlaskConical className="h-4 w-4 text-white" />} color="bg-violet-600">
                    <div className="space-y-3">
                      {summary.formulas.map((f, i) => show('formula', i) && (
                        <FormulaItem key={i} f={f} on={isBookmarked('formula', i)} onToggle={() => toggle('formula', i)} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Exam Tips & Traps */}
                {summary.examTips.some((_, i) => show('examTip', i)) && (
                  <Section title="Exam Tips & Common Traps" icon={<Lightbulb className="h-4 w-4 text-white" />} color="bg-amber-500">
                    <div className="space-y-3">
                      {summary.examTips.map((t, i) => show('examTip', i) && (
                        <TipItem key={i} t={t} on={isBookmarked('examTip', i)} onToggle={() => toggle('examTip', i)} />
                      ))}
                    </div>
                  </Section>
                )}

                {/* High-Yield Facts */}
                {summary.highYield.some((_, i) => show('highYield', i)) && (
                  <Section title="High-Yield Facts" icon={<Zap className="h-4 w-4 text-white" />} color="bg-rose-500">
                    <ul className="space-y-2">
                      {summary.highYield.map((f, i) => show('highYield', i) && (
                        <TextItem key={i} text={f} tone="rose" on={isBookmarked('highYield', i)} onToggle={() => toggle('highYield', i)} />
                      ))}
                    </ul>
                  </Section>
                )}

                {/* One-Minute Revision (not individually bookmarkable; hidden when filtering) */}
                {!onlyBookmarked && summary.oneMinute.length > 0 && (
                  <Section title="One-Minute Revision" icon={<Timer className="h-4 w-4 text-white" />} color="bg-zinc-800">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                      <ul className="space-y-1.5">
                        {summary.oneMinute.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700">
                            <span className="mt-1 flex-none text-zinc-400">•</span><span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Section>
                )}
              </div>
            </div>
          )}

          {!loading && (!summary || (summary.isPublished && !hasContent)) && selectedId && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
              <BookOpen className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-500">No revision sheet available for this chapter yet.</p>
              <p className="text-xs text-zinc-400">Check back soon — our team is working on it.</p>
            </div>
          )}
        </>
      )}

      {/* ════════ BOOKMARKS MODE ════════ */}
      {mode === 'bookmarks' && (
        <>
          {groupsLoading && (
            <div className="rounded-2xl border border-zinc-200 bg-white py-16 shadow-sm">
              <LogoLoader text="Loading your bookmarks…" />
            </div>
          )}

          {!groupsLoading && groups.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
              <Star className="h-9 w-9 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">You haven&apos;t bookmarked anything yet.</p>
              <p className="max-w-sm text-xs text-zinc-400">Open any chapter under <span className="font-semibold">Browse Chapters</span> and tap the bookmark icon to save key points, formulas, and tips here for last-minute revision.</p>
              <button type="button" onClick={() => setMode('browse')} className="mt-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600">Browse Chapters</button>
            </div>
          )}

          {!groupsLoading && groups.length > 0 && (
            <div className="relative">
              {isObfuscated && (
                <button type="button" onClick={() => setIsObfuscated(false)}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 backdrop-blur-md">
                  <Eye className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-semibold text-zinc-700">Content hidden — click to resume</span>
                </button>
              )}
              <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={watermarkStyle} />

              <div className={`relative z-0 space-y-4 select-none ${isObfuscated ? 'blur-md' : ''}`}>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">My Bookmarks</p>
                  <h2 className="mt-1 text-lg font-bold text-emerald-900">{groups.reduce((n, g) => n + g.items.length, 0)} saved item{groups.reduce((n, g) => n + g.items.length, 0) !== 1 ? 's' : ''} across {groups.length} chapter{groups.length !== 1 ? 's' : ''}</h2>
                  <p className="mt-1 text-xs text-emerald-600/70">Your personal last-minute revision list.</p>
                </div>

                {groups.map(g => (
                  <Section key={g.chapterId} title={g.chapterTitle} icon={<BookOpen className="h-4 w-4 text-white" />} color="bg-emerald-600">
                    <div className="space-y-3">
                      {g.items.map((it, idx) => {
                        const rm = () => removeFromGroup(g.chapterId, it.itemType, it.itemIndex);
                        if (it.concept) return <ConceptItem key={idx} c={it.concept} on onToggle={rm} />;
                        if (it.formula) return <FormulaItem key={idx} f={it.formula} on onToggle={rm} />;
                        if (it.tip) return <TipItem key={idx} t={it.tip} on onToggle={rm} />;
                        if (it.text != null) return (
                          <ul key={idx}><TextItem text={it.text} tone="rose" on onToggle={rm} /></ul>
                        );
                        return null;
                      })}
                    </div>
                  </Section>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}
