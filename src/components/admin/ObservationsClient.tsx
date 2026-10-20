'use client';

import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, RefreshCw, Send, Sparkles } from 'lucide-react';
import { X_LIMIT, xLength } from '@/lib/observations/x-length';

export type Obs = {
  id: string;
  date: string;
  symbol: string;
  metricName: string;
  headline: string;
  subtext: string | null;
  chartSvg: string;
  sourceLine: string;
  score: number;
  chartType: string;
  postText: string | null;
  category: string | null;
  slot?: string | null;
  sentAt?: string | Date | null;
  createdAt: string | Date;
};

export type DeskStatus = { breadthDate: string | null; fiiDate: string | null; telegramReady?: boolean };

const FIRST_REPLY = 'Daily charts like this, plus free CMT prep tools: chartix.in';

/** Rasterise a card SVG to PNG with the studio fonts baked in. */
async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const { getFontEmbedCss } = await import('@/lib/studio/font-embed');
  const css = await getFontEmbedCss();
  const withFonts = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${css}</style>`);
  const url = URL.createObjectURL(new Blob([withFonts], { type: 'image/svg+xml' }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not render the card.'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1600 * scale;
    canvas.height = 900 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fileName(o: Obs) {
  const slug = o.metricName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `chartix-${o.date}-${slug}.png`;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function PostCard({ o }: { o: Obs }) {
  const [text, setText] = useState(o.postText ?? o.headline);
  const [copied, setCopied] = useState<'post' | 'reply' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const len = xLength(text);

  async function copy(what: 'post' | 'reply') {
    await navigator.clipboard.writeText(what === 'post' ? text : FIRST_REPLY);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }

  async function download() {
    setBusy(true);
    setErr('');
    try {
      triggerDownload(await svgToPngBlob(o.chartSvg), fileName(o));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-[#FAF8F3] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: o.chartSvg }} />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            {o.category ?? o.chartType}
          </span>
          {o.slot === 'evening' && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Evening</span>
          )}
          {o.sentAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              <Check className="h-3 w-3" /> Sent
            </span>
          )}
          <span className="truncate text-xs text-zinc-500">{o.metricName}</span>
          <span className="ml-auto text-[11px] tabular-nums text-zinc-400" title="Newsworthiness score">score {Math.round(o.score)}</span>
        </div>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            aria-label="Post text"
            className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-800 focus:border-zinc-400 focus:bg-white focus:outline-none"
          />
          <div className="mt-1 flex justify-end">
            <span className={`text-[11px] tabular-nums ${len > X_LIMIT ? 'font-semibold text-red-600' : 'text-zinc-400'}`}>
              {len} / {X_LIMIT}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => copy('post')} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
            {copied === 'post' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'post' ? 'Copied' : 'Copy post'}
          </button>
          <button onClick={download} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PNG
          </button>
          <a
            href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in X
          </a>
        </div>
        <button onClick={() => copy('reply')} className="text-[11px] text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800">
          {copied === 'reply' ? 'Copied — paste it as the first reply' : 'Copy first reply (link goes here, not in the post)'}
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </article>
  );
}

function daysOld(d: string | null) {
  if (!d) return Infinity;
  return Math.round((Date.now() - Date.parse(`${d}T12:00:00Z`)) / 86400_000);
}

function HealthChip({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label}: {value}
    </span>
  );
}

export function ObservationsClient({ initialObs, status }: { initialObs: Obs[]; status?: DeskStatus }) {
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [error, setError] = useState('');
  const obs = initialObs;

  const today = new Date().toISOString().slice(0, 10);
  const date = obs[0]?.date;
  const generatedAt = obs[0] ? new Date(obs[0].createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/observations/generate', { method: 'POST' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body?.error ?? `Generation failed (HTTP ${r.status})`);
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  async function sendTelegram() {
    setSending(true);
    setError('');
    setSentMsg('');
    try {
      const r = await fetch('/api/admin/observations/telegram', { method: 'POST' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) setError(body?.error ?? `Telegram send failed (HTTP ${r.status})`);
      else setSentMsg(`Sent ${body.sent} posts to Telegram${body.failed?.length ? ` (${body.failed.length} failed)` : ''}.`);
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }

  async function downloadAll() {
    setZipping(true);
    setError('');
    try {
      for (const o of obs) {
        triggerDownload(await svgToPngBlob(o.chartSvg), fileName(o));
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-zinc-900">
            {obs.length > 0 ? `${obs.length} posts ready` : 'No posts yet'}
            {date && (
              <span className="font-normal text-zinc-500">
                {' · '}
                {date === today ? `generated today, ${generatedAt} IST` : `from ${date} — today's run hasn't happened yet`}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Built from 15 years of market data. Every number is computed and fact-checked, never invented by AI. Sent to Telegram in tranches: 8:30 AM, 1:00 PM and 9:00 PM IST.
          </p>
        </div>
        {obs.length > 0 && (
          <button onClick={sendTelegram} disabled={sending} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to Telegram
          </button>
        )}
        {obs.length > 0 && (
          <button onClick={downloadAll} disabled={zipping} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60">
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            All PNGs
          </button>
        )}
        <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Reading the markets…' : obs.length ? 'Regenerate' : "Generate today's desk"}
        </button>
      </div>

      {(() => {
        const morning = obs.filter((o) => o.slot !== 'evening');
        const evening = obs.filter((o) => o.slot === 'evening');
        const sent = (l: Obs[]) => l.filter((o) => o.sentAt).length;
        // Weekend gaps are normal: data only updates on trading days.
        const fresh = (d: string | null) => daysOld(d) <= 4;
        return (
          <div className="flex flex-wrap gap-2" aria-label="Pipeline health">
            <HealthChip label="Breadth data" ok={fresh(status?.breadthDate ?? null)} value={status?.breadthDate ?? 'none'} />
            <HealthChip label="FII/DII data" ok={fresh(status?.fiiDate ?? null)} value={status?.fiiDate ?? 'none'} />
            <HealthChip label="Telegram on server" ok={!!status?.telegramReady} value={status?.telegramReady ? 'configured' : 'NOT configured — add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel'} />
            <HealthChip label="Telegram, morning" ok value={`${sent(morning)} of ${morning.length} sent`} />
            {evening.length > 0 && <HealthChip label="Telegram, evening" ok value={`${sent(evening)} of ${evening.length} sent`} />}
          </div>
        );
      })()}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {sentMsg && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sentMsg}</p>}

      <details className="group rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-emerald-700" /> How to grow on X with these
          <span className="ml-auto text-xs font-normal text-emerald-700 group-open:hidden">show</span>
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-6 text-emerald-900">
          <li>Post each tranche as it lands on Telegram: 3 posts at 8:30 AM, the rest at 1:00 PM, and 3 fresh post-close posts at 9:00 PM IST (weekdays).</li>
          <li>Always attach the PNG. Posts with a chart get far more reach than text alone.</li>
          <li>Keep links out of the post itself. Paste the &ldquo;first reply&rdquo; with chartix.in under your own post.</li>
          <li>Reply to every comment in the first hour, and quote-post big accounts when a card adds context to their take.</li>
          <li>Pin your best-performing card each week. Consistency (daily, same look) is what builds a following.</li>
        </ul>
      </details>

      {obs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
          <p className="text-sm text-zinc-500">No posts yet. Click &ldquo;Generate today&apos;s desk&rdquo;. It takes about 20 seconds.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {obs.map((o) => <PostCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  );
}
