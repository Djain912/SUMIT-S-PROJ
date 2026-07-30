'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { CONTENT_PLAN, TOTAL_DAYS } from '@/lib/studio/content-plan';
import {
  buildSlides, categoryFor, formatFor, FORMAT_LABELS, THEMES,
  SLIDE_H, SLIDE_W,
  type FormatKey, type StudioContent,
} from '@/lib/studio/design';
import { StudioSlide } from './StudioSlide';

const FORMAT_KEYS: FormatKey[] = ['deep_dive', 'quick_card', 'myth_buster', 'chart_quiz', 'notebook'];

/** Preview scale — slides are 1080x1350 but shown small. Export always renders full size. */
const PREVIEW_SCALE = 0.26;

export function StudioClient({ logoUrl }: { logoUrl?: string }) {
  const [day, setDay] = useState(1);
  const [topic, setTopic] = useState(CONTENT_PLAN[1] ?? '');
  const [formatOverride, setFormatOverride] = useState<FormatKey | 'auto'>('auto');
  const [content, setContent] = useState<StudioContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const category = useMemo(() => categoryFor(day, topic), [day, topic]);
  const theme = THEMES[category];
  const fmt: FormatKey = formatOverride === 'auto' ? formatFor(day) : formatOverride;
  const slides = useMemo(
    () => (content ? buildSlides(day, topic, content, fmt) : []),
    [content, day, topic, fmt],
  );

  function onDayChange(next: number) {
    const d = Math.min(Math.max(1, next), TOTAL_DAYS);
    setDay(d);
    if (CONTENT_PLAN[d]) setTopic(CONTENT_PLAN[d]);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, topic }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? 'Generation failed');
      }
      setContent(json.data as StudioContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function exportPngs() {
    if (!stageRef.current || slides.length === 0) return;
    setExporting('Preparing…');
    try {
      const { slideToPngDataUrl } = await import('@/lib/studio/export');
      const { getFontEmbedCss } = await import('@/lib/studio/font-embed');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const nodes = Array.from(
        stageRef.current.querySelectorAll<HTMLElement>('[data-studio-slide]'),
      );

      setExporting('Embedding fonts…');
      const fontEmbedCSS = await getFontEmbedCss();

      for (let i = 0; i < nodes.length; i++) {
        setExporting(`Rendering slide ${i + 1} of ${nodes.length}…`);
        // pixelRatio 2 -> 2160x2700
        const dataUrl = await slideToPngDataUrl(nodes[i], { pixelRatio: 2, fontEmbedCSS });
        zip.file(
          `Day${String(day).padStart(2, '0')}_${String(i + 1).padStart(2, '0')}.png`,
          dataUrl.split(',')[1],
          { base64: true },
        );
      }

      setExporting('Building zip…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Day${String(day).padStart(2, '0')}_${topic.replace(/[^\w]+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  const fmtMeta = FORMAT_LABELS[fmt];

  return (
    <div className="space-y-6">
      {/* controls */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Day</span>
            <input
              type="number" min={1} max={TOTAL_DAYS} value={day}
              onChange={(e) => onDayChange(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Topic</span>
            <input
              type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Format</span>
            <select
              value={formatOverride}
              onChange={(e) => setFormatOverride(e.target.value as FormatKey | 'auto')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="auto">Auto (rotates by day)</option>
              {FORMAT_KEYS.map((k) => (
                <option key={k} value={k}>{FORMAT_LABELS[k].name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={generate} disabled={busy || !topic.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? 'Writing content…' : content ? 'Regenerate content' : 'Generate content'}
          </button>

          <button
            onClick={exportPngs} disabled={!content || !!exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ?? 'Download all as PNG'}
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="rounded-full px-2.5 py-1 font-semibold"
              style={{ background: theme.soft, color: theme.accent }}>
              {theme.label}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
              {fmtMeta.name} · {fmtMeta.slides}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
              {SLIDE_W}×{SLIDE_H}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      {/* preview */}
      {!content ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-16 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            Pick a day and press <strong>Generate content</strong>.<br />
            The theme and layout change automatically so no two days look alike.
          </p>
        </div>
      ) : (
        <div
          ref={stageRef}
          className="flex flex-wrap gap-5 rounded-2xl border border-zinc-200 bg-zinc-100 p-5"
        >
          {slides.map((s, i) => (
            <div
              key={i}
              style={{
                width: SLIDE_W * PREVIEW_SCALE,
                height: SLIDE_H * PREVIEW_SCALE,
                overflow: 'hidden',
                borderRadius: 10,
                boxShadow: '0 1px 6px rgba(0,0,0,.10)',
                flex: '0 0 auto',
              }}
            >
              <div style={{
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: 'top left',
                width: SLIDE_W,
                height: SLIDE_H,
              }}>
                <StudioSlide
                  slide={s} theme={theme} index={i + 1}
                  total={slides.length} logoUrl={logoUrl}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
