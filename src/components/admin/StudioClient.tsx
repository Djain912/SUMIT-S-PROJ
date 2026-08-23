'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, ImagePlus, Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { CONTENT_PLAN, TOTAL_DAYS } from '@/lib/studio/content-plan';
import {
  AUDIENCES, CHART_ANCHORS, FORMAT_LABELS, FORMAT_ROTATION, PLATFORMS, PRESENTATION_THEMES, THEMES,
  buildSlides, formatAllowed, resolveFormat, themeKeyFor,
  type AudienceKey, type CategoryKey, type ChartAnchor, type FormatKey, type PlatformKey,
  type StudioChart, type StudioContent,
} from '@/lib/studio/design';
import { StudioSlide } from './StudioSlide';

const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];
const AUDIENCE_KEYS = Object.keys(AUDIENCES) as AudienceKey[];
const TOPIC_THEMES = (Object.keys(THEMES) as CategoryKey[])
  .filter((k) => !PRESENTATION_THEMES.includes(k));

export function StudioClient({ logoUrl }: { logoUrl?: string }) {
  const [day, setDay] = useState(1);
  const [topic, setTopic] = useState(CONTENT_PLAN[1] ?? '');
  const [platform, setPlatform] = useState<PlatformKey>('instagram');
  const [audience, setAudience] = useState<AudienceKey>('beginner');
  const [formatOverride, setFormatOverride] = useState<FormatKey | 'auto'>('auto');
  const [themeOverride, setThemeOverride] = useState<CategoryKey | 'auto'>('auto');
  const [brief, setBrief] = useState('');
  const [charts, setCharts] = useState<StudioChart[]>([]);
  const [content, setContent] = useState<StudioContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const plat = PLATFORMS[platform];
  const isText = plat.output === 'text';
  const themeKey = themeKeyFor(day, topic, audience, platform, themeOverride);
  const theme = THEMES[themeKey];
  const fmt = resolveFormat(day, audience, platform, formatOverride);
  const slides = useMemo(
    () => (content && !isText ? buildSlides(day, topic, content, fmt, charts) : []),
    [content, day, topic, fmt, isText, charts],
  );

  // Preview scale — fit roughly three portrait slides across.
  const previewScale = plat.w > plat.h ? 0.30 : 0.26;

  function onDayChange(next: number) {
    const d = Math.min(Math.max(1, next), TOTAL_DAYS);
    setDay(d);
    if (CONTENT_PLAN[d]) setTopic(CONTENT_PLAN[d]);
  }

  async function generate() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day, topic, audience, platform, brief,
          chartCaptions: charts.map((c) => c.caption),
        }),
      });
      const text = await res.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch {
        throw new Error(`Server returned invalid response (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok || !json.success) throw new Error((json?.error as Record<string, string>)?.message ?? `Generation failed (HTTP ${res.status})`);
      setContent(json.data as StudioContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  async function exportPngs() {
    if (!stageRef.current || slides.length === 0) return;
    setExporting('Preparing…'); setError(null);
    try {
      const { slideToPngDataUrl } = await import('@/lib/studio/export');
      const { getFontEmbedCss } = await import('@/lib/studio/font-embed');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const nodes = Array.from(stageRef.current.querySelectorAll<HTMLElement>('[data-studio-slide]'));

      setExporting('Embedding fonts…');
      const fontEmbedCSS = await getFontEmbedCss();

      for (let i = 0; i < nodes.length; i++) {
        setExporting(`Rendering slide ${i + 1} of ${nodes.length}…`);
        const dataUrl = await slideToPngDataUrl(nodes[i], {
          pixelRatio: 2, fontEmbedCSS, width: plat.w, height: plat.h,
        });
        zip.file(
          `${platform}_Day${String(day).padStart(2, '0')}_${String(i + 1).padStart(2, '0')}.png`,
          dataUrl.split(',')[1], { base64: true },
        );
      }

      setExporting('Building zip…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${platform}_Day${String(day).padStart(2, '0')}_${topic.replace(/[^\w]+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally { setExporting(null); }
  }

  /** Downscale on read - a raw 4MB screenshot would bloat the export SVG. */
  function addCharts(files: FileList | null) {
    if (!files) return;
    Array.from(files).slice(0, 6).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          const ratio = Math.min(1, MAX / img.naturalWidth);
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.naturalWidth * ratio);
          cv.height = Math.round(img.naturalHeight * ratio);
          cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
          setCharts((prev) => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: cv.toDataURL('image/png'),
            caption: '',
            anchor: 'after_explainer' as ChartAnchor,
          }]);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function updateChart(id: string, patch: Partial<StudioChart>) {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function copyRedditPost() {
    if (!content) return;
    const text = `${content.reddit_title ?? ''}\n\n${content.reddit_body ?? ''}`.trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmtMeta = FORMAT_LABELS[fmt];

  return (
    <div className="space-y-6">
      {/* ---- controls ---- */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        {/* platform tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PLATFORM_KEYS.map((k) => (
            <button key={k} onClick={() => setPlatform(k)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                platform === k ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {PLATFORMS[k].label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-zinc-500">{plat.note}</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Day</span>
            <input type="number" min={1} max={TOTAL_DAYS} value={day}
              onChange={(e) => onDayChange(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Topic</span>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Written for</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceKey)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {AUDIENCE_KEYS.map((k) => <option key={k} value={k}>{AUDIENCES[k].label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Theme</span>
            <select value={themeOverride} disabled={isText}
              onChange={(e) => setThemeOverride(e.target.value as CategoryKey | 'auto')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100">
              <option value="auto">Auto</option>
              <optgroup label="Professional">
                {PRESENTATION_THEMES.map((k) => <option key={k} value={k}>{THEMES[k].label}</option>)}
              </optgroup>
              <optgroup label="By topic">
                {TOPIC_THEMES.map((k) => <option key={k} value={k}>{THEMES[k].label}</option>)}
              </optgroup>
            </select>
          </label>
        </div>

        {/* brief — the strongest steer on what the post actually says */}
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Brief — what should this post actually cover?
          </span>
          <textarea
            value={brief} onChange={(e) => setBrief(e.target.value)} rows={3}
            placeholder={'e.g. "CMT is a global designation, not an Indian one. Three levels, roughly two years. Aimed at analysts and portfolio managers, not day traders. Emphasise it is the recognised credential for technical analysis, awarded by the CMT Association."'}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Leave blank to let the model pick its own angle. Anything here overrides that.
          </span>
        </label>

        {/* charts */}
        {!isText && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Charts ({charts.length})
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                <ImagePlus className="h-4 w-4" />
                Add chart image
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { addCharts(e.target.files); e.target.value = ''; }} />
              </label>
            </div>

            {charts.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Upload your own TradingView screenshots. Each becomes its own slide, and the copy is
                written to set it up. Images stay in your browser — they are never uploaded anywhere.
              </p>
            ) : (
              <div className="space-y-3">
                {charts.map((ch) => (
                  <div key={ch.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ch.dataUrl} alt="" className="h-16 w-24 flex-shrink-0 rounded object-cover" />
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <input type="text" value={ch.caption}
                        onChange={(e) => updateChart(ch.id, { caption: e.target.value })}
                        placeholder="Caption — what does this chart show?"
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm" />
                      <select value={ch.anchor}
                        onChange={(e) => updateChart(ch.id, { anchor: e.target.value as ChartAnchor })}
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm">
                        {CHART_ANCHORS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setCharts((p) => p.filter((x) => x.id !== ch.id))}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove chart">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isText && (
          <div className="mt-4 max-w-xs">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Layout</span>
              <select value={formatOverride}
                onChange={(e) => setFormatOverride(e.target.value as FormatKey | 'auto')}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="auto">Auto (rotates by day)</option>
                {FORMAT_ROTATION.filter((v, i, a) => a.indexOf(v) === i)
                  .filter((k) => formatAllowed(k, audience, platform))
                  .map((k) => <option key={k} value={k}>{FORMAT_LABELS[k].name}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={busy || !topic.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? 'Writing…' : content ? 'Regenerate' : 'Generate content'}
          </button>

          {isText ? (
            <button onClick={copyRedditPost} disabled={!content}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy post'}
            </button>
          ) : (
            <button onClick={exportPngs} disabled={!content || !!exporting}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ?? 'Download all as PNG'}
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full px-2.5 py-1 font-semibold"
              style={{ background: theme.soft, color: theme.dark ? theme.accent : theme.accent }}>
              {theme.label}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
              {AUDIENCES[audience].label}
            </span>
            {!isText && (
              <>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
                  {fmtMeta.name}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
                  {plat.w}×{plat.h}
                </span>
              </>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">{AUDIENCES[audience].note}</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {/* ---- output ---- */}
      {!content ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-16 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            Choose a platform and audience, then press <strong>Generate content</strong>.
          </p>
        </div>
      ) : isText ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Title</p>
          <p className="mb-5 text-lg font-semibold text-zinc-900">{content.reddit_title}</p>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Body</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-sans text-sm leading-relaxed text-zinc-800">
            {content.reddit_body}
          </pre>
          <p className="mt-3 text-xs text-zinc-500">
            No link or brand mention is included — Reddit removes promotional posts. Add context in the comments instead.
          </p>
        </div>
      ) : (
        <div ref={stageRef} className="flex flex-wrap gap-5 rounded-2xl border border-zinc-200 bg-zinc-100 p-5">
          {slides.map((s, i) => (
            <div key={i} style={{
              width: plat.w * previewScale, height: plat.h * previewScale,
              overflow: 'hidden', borderRadius: 10,
              boxShadow: '0 1px 6px rgba(0,0,0,.10)', flex: '0 0 auto',
            }}>
              <div style={{
                transform: `scale(${previewScale})`, transformOrigin: 'top left',
                width: plat.w, height: plat.h,
              }}>
                <StudioSlide slide={s} theme={theme} index={i + 1} total={slides.length}
                  logoUrl={logoUrl} width={plat.w} height={plat.h} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
