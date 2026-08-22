'use client';

import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';

type Obs = {
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
};

export function ObservationsClient({ initialObs }: { initialObs: Obs[] }) {
  const [obs] = useState<Obs[]>(initialObs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/observations/generate', { method: 'POST' });
      if (!r.ok) { setError('Generation failed — check console'); setLoading(false); return; }
      // Reload page to get fresh data
      window.location.reload();
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  function downloadSvg(o: Obs) {
    const blob = new Blob([o.chartSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observation-${o.symbol}-${o.date}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0, 10);
  const isToday = obs.length > 0 && obs[0].date === today;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            {obs.length > 0
              ? `${obs.length} posts ready · ${isToday ? 'Generated today' : `Last: ${obs[0]?.date}`}`
              : 'No posts yet — click Generate'}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : "Generate Today's Posts"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {obs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
          <p className="text-sm text-zinc-400">No observations yet. Click &quot;Generate&quot; to create today&apos;s posts.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {obs.map((o) => (
            <div key={o.id} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {/* SVG preview */}
              <div
                className="aspect-square w-full bg-[#0d0d0d]"
                dangerouslySetInnerHTML={{ __html: o.chartSvg }}
              />

              {/* Info */}
              <div className="p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {o.metricName}
                  </span>
                  <span className="ml-auto text-[10px] text-zinc-400">score {Math.round(o.score)}</span>
                </div>
                <p className="text-sm font-semibold leading-snug text-zinc-900">{o.headline}</p>
                {o.subtext && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{o.subtext}</p>
                )}
                <p className="mt-2 text-[10px] text-zinc-400">Source: {o.sourceLine}</p>

                <button
                  onClick={() => downloadSvg(o)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download SVG
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
