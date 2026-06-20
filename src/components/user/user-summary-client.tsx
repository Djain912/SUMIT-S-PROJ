'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Lightbulb, FlaskConical, BookOpen, AlertCircle, Brain, Zap, Timer } from 'lucide-react';
import { type ChapterSummaryContent, type SummaryItemType } from '@/lib/chapter-summary/types';

type BookmarkKey = { itemType: string; itemIndex: number };
type Summary = ChapterSummaryContent & { chapterId: string; isPublished: boolean };
type Chapter = { id: string; title: string };

function createWatermarkStyle(text: string): CSSProperties {
  const safe = text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260"><g transform="translate(40,140) rotate(-22)"><text x="0" y="0" font-size="18" fill="currentColor" font-family="Arial,sans-serif">${safe}</text></g></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '420px 260px',
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

export function UserSummaryClient({ userEmail }: { userEmail: string }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const watermarkStyle = createWatermarkStyle(userEmail);

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

  useEffect(() => { if (selectedId) loadSummary(selectedId); }, [selectedId, loadSummary]);

  const isBookmarked = (t: SummaryItemType, i: number) => bookmarks.some(b => b.itemType === t && b.itemIndex === i);

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

  const selectedChapter = chapters.find(c => c.id === selectedId);
  const hasContent = summary && (summary.summary.length || summary.keyConcepts.length || summary.formulas.length || summary.examTips.length || summary.highYield.length || summary.oneMinute.length);

  return (
    <div className="flex flex-col gap-6">
      {/* Chapter selector */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Select Chapter</p>
        </div>
        <div className="relative p-4">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-zinc-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {loading && <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-100" />)}</div>}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 flex-none" /> {error}
        </div>
      )}

      {!loading && !error && summary && !summary.isPublished && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-none" /> Revision sheet for this chapter is being prepared. Check back soon!
        </div>
      )}

      {!loading && !error && summary?.isPublished && hasContent && (
        <div className="relative text-zinc-500/10" style={watermarkStyle}>
          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Quick Revision Sheet</p>
              <h2 className="mt-1 text-lg font-bold text-emerald-900">{selectedChapter?.title}</h2>
              <p className="mt-1 text-xs text-emerald-600/70">Everything that matters most — readable in 5-10 minutes.</p>
            </div>

            {/* Chapter Summary */}
            {summary.summary.length > 0 && (
              <Section title={`Chapter Summary (${summary.summary.length})`} icon={<BookOpen className="h-4 w-4 text-white" />} color="bg-emerald-600">
                <ul className="space-y-2">
                  {summary.summary.map((pt, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 transition hover:bg-emerald-50/40">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{i + 1}</span>
                      <span className="flex-1 text-sm leading-relaxed text-zinc-700">{pt}</span>
                      <BookmarkBtn on={isBookmarked('summary', i)} onClick={() => toggle('summary', i)} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Key Concepts */}
            {summary.keyConcepts.length > 0 && (
              <Section title={`Key Concepts to Remember (${summary.keyConcepts.length})`} icon={<Brain className="h-4 w-4 text-white" />} color="bg-sky-600">
                <div className="space-y-3">
                  {summary.keyConcepts.map((c, i) => (
                    <div key={i} className="rounded-xl border border-sky-100 bg-sky-50/30 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-sky-900">{c.name}</p>
                          {c.definition && <p className="mt-1 text-sm leading-relaxed text-zinc-700">{c.definition}</p>}
                          {c.whyItMatters && <p className="mt-1.5 text-xs leading-relaxed text-zinc-500"><span className="font-semibold text-zinc-600">Why it matters:</span> {c.whyItMatters}</p>}
                          {c.examAngle && <p className="mt-1 text-xs leading-relaxed text-amber-700"><span className="font-semibold">Exam angle:</span> {c.examAngle}</p>}
                        </div>
                        <BookmarkBtn on={isBookmarked('keyConcept', i)} onClick={() => toggle('keyConcept', i)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Formulas */}
            {summary.formulas.length > 0 && (
              <Section title={`Important Formulas (${summary.formulas.length})`} icon={<FlaskConical className="h-4 w-4 text-white" />} color="bg-violet-600">
                <div className="space-y-3">
                  {summary.formulas.map((f, i) => (
                    <div key={i} className="rounded-xl border border-violet-100 bg-violet-50/30 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">{f.label}</p>
                          <p className="mt-1.5 font-mono text-sm font-semibold text-zinc-800">{f.expression}</p>
                          {f.notes && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.notes}</p>}
                        </div>
                        <BookmarkBtn on={isBookmarked('formula', i)} onClick={() => toggle('formula', i)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Exam Tips & Traps */}
            {summary.examTips.length > 0 && (
              <Section title={`Exam Tips & Common Traps (${summary.examTips.length})`} icon={<Lightbulb className="h-4 w-4 text-white" />} color="bg-amber-500">
                <div className="space-y-3">
                  {summary.examTips.map((t, i) => (
                    <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          {t.remember && <p className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700"><span className="flex-none">✅</span><span>{t.remember}</span></p>}
                          {t.mistake && <p className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700"><span className="flex-none">❌</span><span>{t.mistake}</span></p>}
                        </div>
                        <BookmarkBtn on={isBookmarked('examTip', i)} onClick={() => toggle('examTip', i)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* High-Yield Facts */}
            {summary.highYield.length > 0 && (
              <Section title={`High-Yield Facts (${summary.highYield.length})`} icon={<Zap className="h-4 w-4 text-white" />} color="bg-rose-500">
                <ul className="space-y-2">
                  {summary.highYield.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/30 px-4 py-3">
                      <span className="mt-1 flex-none text-rose-400">▸</span>
                      <span className="flex-1 text-sm leading-relaxed text-zinc-700">{f}</span>
                      <BookmarkBtn on={isBookmarked('highYield', i)} onClick={() => toggle('highYield', i)} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* One-Minute Revision */}
            {summary.oneMinute.length > 0 && (
              <Section title="One-Minute Revision" icon={<Timer className="h-4 w-4 text-white" />} color="bg-zinc-800">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <ul className="space-y-1.5">
                    {summary.oneMinute.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700">
                        <span className="mt-1 flex-none text-zinc-400">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            )}
          </div>
        </div>
      )}

      {!loading && !error && (!summary || (summary.isPublished && !hasContent)) && selectedId && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No revision sheet available for this chapter yet.</p>
          <p className="text-xs text-zinc-400">Check back soon — our team is working on it.</p>
        </div>
      )}
    </div>
  );
}
