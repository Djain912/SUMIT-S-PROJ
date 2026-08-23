'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, TrendingUp } from 'lucide-react';

type Period = 'weekly' | 'monthly';

export function FiiDiiReportClient() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // Clean up the previous blob URL whenever it's replaced or the component unmounts.
  useEffect(() => () => { if (imgUrl) URL.revokeObjectURL(imgUrl); }, [imgUrl]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/fii-dii?period=${period}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Failed (${res.status})`);
      }
      const blob = await res.blob();
      setImgUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['weekly', 'monthly'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition ${
                period === p ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {p}
            </button>
          ))}
        </div>

        <p className="mb-4 text-xs text-zinc-500">
          {period === 'weekly'
            ? 'Cumulative FII/DII net cash flow over the last 7 days, plus the current sector-wise FPI table.'
            : 'Cumulative FII/DII net cash flow over the last 30 days, plus the current sector-wise FPI table.'}
          {' '}Cash-flow numbers are live from our own data. The sector table is NSDL&apos;s fortnightly figure —
          the image always prints the exact date that data is from, so it&apos;s never presented as fresher than it is.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {busy ? 'Generating…' : imgUrl ? 'Regenerate' : 'Generate report'}
          </button>

          {imgUrl && (
            <a href={imgUrl} download={`chartix-fii-dii-${period}.png`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900">
              <Download className="h-4 w-4" />
              Download PNG
            </a>
          )}

          <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            1080×1350
          </span>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {imgUrl ? (
        <div className="flex justify-center rounded-2xl border border-zinc-200 bg-zinc-100 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="FII/DII report preview"
            className="max-h-[900px] w-auto rounded-xl shadow-sm" />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-16 text-center">
          <TrendingUp className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            Pick weekly or monthly and press <strong>Generate report</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
