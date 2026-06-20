'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, ChevronDown, GripVertical, Sparkles, Loader2, Zap } from 'lucide-react';
import { EMPTY_SUMMARY, type ChapterSummaryContent, type KeyConcept, type Formula, type ExamTip } from '@/lib/chapter-summary/types';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
type Chapter = { id: string; title: string };

const LEVEL_LABELS: Record<Level, string> = { LEVEL_1: 'Level I', LEVEL_2: 'Level II', LEVEL_3: 'Level III' };

// ── Generic string-bullet list editor ──
function StringList({
  label, placeholder, items, onChange, color,
}: { label: string; placeholder: string; items: string[]; onChange: (i: string[]) => void; color: string }) {
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</label>
        <button type="button" onClick={() => onChange([...items, ''])} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400">No items yet</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <GripVertical className="mt-2.5 h-4 w-4 flex-none text-zinc-300" />
          <textarea value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder} rows={2}
            className="flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="mt-1.5 rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Key Concepts editor ──
function ConceptList({ items, onChange }: { items: KeyConcept[]; onChange: (i: KeyConcept[]) => void }) {
  const update = (i: number, f: keyof KeyConcept, v: string) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-sky-600">Key Concepts to Remember</label>
        <button type="button" onClick={() => onChange([...items, { name: '', definition: '', whyItMatters: '', examAngle: '' }])} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400">No concepts yet</p>}
      {items.map((c, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/30 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input value={c.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Concept name (e.g. Beta)"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-800 focus:border-sky-400 focus:outline-none" />
              <input value={c.definition} onChange={e => update(i, 'definition', e.target.value)} placeholder="Definition"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-sky-400 focus:outline-none" />
              <input value={c.whyItMatters} onChange={e => update(i, 'whyItMatters', e.target.value)} placeholder="Why it matters"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-sky-400 focus:outline-none" />
              <input value={c.examAngle} onChange={e => update(i, 'examAngle', e.target.value)} placeholder="Common exam angle"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 focus:border-sky-400 focus:outline-none" />
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="mt-1.5 rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Formula editor ──
function FormulaList({ items, onChange }: { items: Formula[]; onChange: (f: Formula[]) => void }) {
  const update = (i: number, f: keyof Formula, v: string) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-violet-600">Important Formulas</label>
        <button type="button" onClick={() => onChange([...items, { label: '', expression: '', notes: '' }])} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400">No formulas (fine if the chapter has none)</p>}
      {items.map((f, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/30 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input value={f.label} onChange={e => update(i, 'label', e.target.value)} placeholder="Formula name (e.g. RSI)"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-800 focus:border-violet-400 focus:outline-none" />
              <input value={f.expression} onChange={e => update(i, 'expression', e.target.value)} placeholder="Expression (e.g. RSI = 100 – 100/(1+RS))"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 font-mono text-sm text-zinc-800 focus:border-violet-400 focus:outline-none" />
              <input value={f.notes} onChange={e => update(i, 'notes', e.target.value)} placeholder="Variables + interpretation + common trap"
                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 focus:border-violet-400 focus:outline-none" />
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="mt-1.5 rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Exam Tips (Remember / Mistake pairs) editor ──
function ExamTipList({ items, onChange }: { items: ExamTip[]; onChange: (t: ExamTip[]) => void }) {
  const update = (i: number, f: keyof ExamTip, v: string) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; onChange(n); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-amber-600">Exam Tips &amp; Common Traps</label>
        <button type="button" onClick={() => onChange([...items, { remember: '', mistake: '' }])} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400">No tips yet</p>}
      {items.map((t, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/30 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">✅</span>
                <input value={t.remember} onChange={e => update(i, 'remember', e.target.value)} placeholder="What to remember"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-emerald-400 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">❌</span>
                <input value={t.mistake} onChange={e => update(i, 'mistake', e.target.value)} placeholder="Common mistake / distractor"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 focus:border-red-400 focus:outline-none" />
              </div>
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="mt-1.5 rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminSummaryClient({ initialLevel }: { initialLevel: Level }) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [content, setContent] = useState<ChapterSummaryContent>(EMPTY_SUMMARY);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; current: string }>({ running: false, done: 0, total: 0, current: '' });
  const [error, setError] = useState('');

  const set = <K extends keyof ChapterSummaryContent>(k: K, v: ChapterSummaryContent[K]) =>
    setContent(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch(`/api/user/dashboard?level=${level}`)
      .then(r => r.json())
      .then((d: { success: boolean; data?: { sections: { chapters: Chapter[] }[] } }) => {
        if (d.success && d.data) {
          const chs = d.data.sections.flatMap(s => s.chapters);
          setChapters(chs);
          setSelectedId(chs[0]?.id ?? '');
        }
      })
      .catch(() => {});
  }, [level]);

  const loadSummary = useCallback(async (chapterId: string) => {
    if (!chapterId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/chapter-summary/${chapterId}`);
      const data = await res.json() as { success: boolean; data: (ChapterSummaryContent & { isPublished: boolean }) | null };
      if (data.success && data.data) {
        const { isPublished: pub, ...rest } = data.data;
        setContent(rest);
        setIsPublished(pub);
      } else {
        setContent(EMPTY_SUMMARY); setIsPublished(false);
      }
    } catch {
      setError('Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedId) loadSummary(selectedId); }, [selectedId, loadSummary]);

  const handleSave = async (publish: boolean) => {
    if (!selectedId) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/chapter-summary/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...content, isPublished: publish }),
      });
      const data = await res.json() as { success: boolean; error?: { message: string } };
      if (!data.success) throw new Error(data.error?.message ?? 'Save failed');
      setIsPublished(publish);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/admin/chapter-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: selectedId }),
      });
      const data = await res.json() as { success: boolean; data?: ChapterSummaryContent; error?: { message: string } };
      if (!data.success || !data.data) throw new Error(data.error?.message ?? 'Generation failed');
      setContent(data.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Generate + save-as-draft for every chapter in this level, sequentially.
  const handleBulkGenerate = async () => {
    if (!chapters.length) return;
    if (!confirm(`Generate AI revision sheets for all ${chapters.length} chapters in ${LEVEL_LABELS[level]}?\n\nEach is saved as a DRAFT for you to review and publish. This may take a few minutes.`)) return;
    setBulk({ running: true, done: 0, total: chapters.length, current: '' });
    setError('');
    let failures = 0;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      setBulk(b => ({ ...b, current: ch.title, done: i }));
      try {
        const gRes = await fetch('/api/admin/chapter-summary/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId: ch.id }),
        });
        const gData = await gRes.json() as { success: boolean; data?: ChapterSummaryContent };
        if (!gData.success || !gData.data) { failures++; continue; }
        await fetch(`/api/chapter-summary/${ch.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...gData.data, isPublished: false }),
        });
      } catch { failures++; }
    }
    setBulk({ running: false, done: chapters.length, total: chapters.length, current: '' });
    if (failures) setError(`${failures} chapter(s) could not be generated (likely no published notes). The rest were saved as drafts.`);
    if (selectedId) loadSummary(selectedId);
  };

  const total = content.summary.length + content.keyConcepts.length + content.formulas.length + content.examTips.length + content.highYield.length + content.oneMinute.length;
  const busy = saving || generating || bulk.running;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Content Studio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Key Takeaways Editor</h1>
          <p className="mt-1 text-sm text-zinc-500">Quick revision sheets — generate with AI from chapter notes, review, then publish.</p>
        </div>
        <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
          {(Object.keys(LEVEL_LABELS) as Level[]).map(l => (
            <button key={l} type="button" onClick={() => setLevel(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${level === l ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk generate banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600"><Zap className="h-4 w-4 text-white" /></span>
          <div>
            <p className="text-sm font-bold text-indigo-900">Bulk AI Generation</p>
            <p className="text-xs text-indigo-600">Draft revision sheets for all {chapters.length} {LEVEL_LABELS[level]} chapters at once.</p>
          </div>
        </div>
        <button type="button" onClick={handleBulkGenerate} disabled={busy || !chapters.length}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50">
          {bulk.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {bulk.running ? `Generating ${bulk.done}/${bulk.total}…` : 'Generate All Chapters'}
        </button>
      </div>
      {bulk.running && (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="truncate">Current: {bulk.current || '…'}</span>
            <span>{bulk.done}/{bulk.total}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(bulk.done / Math.max(1, bulk.total)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Chapter selector */}
      <div className="relative">
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={busy}
          className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-zinc-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60">
          {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-400" />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
      ) : (
        <>
          {/* Status + AI generate */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{isPublished ? 'Published' : 'Draft'}
            </span>
            <span className="text-xs text-zinc-400">{total} item{total !== 1 ? 's' : ''}</span>
            {saved && <span className="text-xs font-semibold text-emerald-600">✓ Saved</span>}
            <button type="button" onClick={handleGenerate} disabled={busy}
              className="ml-auto flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>

          {/* Editors */}
          <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <StringList label="Chapter Summary" placeholder="A key takeaway from this chapter…" items={content.summary} onChange={v => set('summary', v)} color="text-emerald-700" />
            <div className="border-t border-zinc-100" />
            <ConceptList items={content.keyConcepts} onChange={v => set('keyConcepts', v)} />
            <div className="border-t border-zinc-100" />
            <FormulaList items={content.formulas} onChange={v => set('formulas', v)} />
            <div className="border-t border-zinc-100" />
            <ExamTipList items={content.examTips} onChange={v => set('examTips', v)} />
            <div className="border-t border-zinc-100" />
            <StringList label="High-Yield Facts" placeholder="A frequently-tested fact, rule, or threshold…" items={content.highYield} onChange={v => set('highYield', v)} color="text-rose-600" />
            <div className="border-t border-zinc-100" />
            <StringList label="One-Minute Revision" placeholder="An ultra-short bullet capturing the chapter…" items={content.oneMinute} onChange={v => set('oneMinute', v)} color="text-zinc-700" />
          </div>

          {/* Save actions */}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => handleSave(false)} disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50">
              <Save className="h-4 w-4" /> Save as Draft
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50">
              <Eye className="h-4 w-4" /> {isPublished ? 'Update & Keep Published' : 'Publish for Students'}
            </button>
            {isPublished && (
              <button type="button" onClick={() => handleSave(false)} disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-50">
                <EyeOff className="h-4 w-4" /> Unpublish
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
