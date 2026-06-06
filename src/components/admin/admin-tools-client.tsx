'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Copy, Check } from 'lucide-react';

const TOOLS = [
  { key: 'rsi', name: 'RSI', desc: 'Relative Strength Index — momentum on a 0–100 scale.' },
  { key: 'roc', name: 'ROC', desc: 'Rate of Change — % price change vs n bars ago.' },
  { key: 'macd', name: 'MACD', desc: 'Momentum from the gap between two EMAs.' },
  { key: 'stochastics', name: 'Stochastics', desc: 'Close vs the recent high-low range (%K / %D).' },
  { key: 'adl', name: 'Accumulation / Distribution', desc: 'Running volume total weighted by close position.' },
  { key: 'mfi', name: 'Money Flow Index', desc: 'A volume-weighted RSI (0–100).' },
  { key: 'ppo', name: 'PPO', desc: 'MACD shown as a percentage (normalized).' },
  { key: 'dmi', name: 'DMI / ADX', desc: 'Trend direction (+DI/−DI) and strength (ADX).' },
];

function snippet(key: string, name: string) {
  return `<a href="/tools/${key}">▶ Open the interactive ${name} calculator</a>`;
}

export function AdminToolsClient() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-zinc-700">
        These are the interactive, <span className="font-medium">premium-only</span> indicator tools. Click <span className="font-medium">Open</span> to view one,
        or <span className="font-medium">Copy link</span> and paste the snippet into a note (use the note editor&apos;s source/code view) so students can jump straight to it.
      </div>

      {TOOLS.map((t) => (
        <div key={t.key} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
              <p className="text-xs text-zinc-500">{t.desc}</p>
            </div>
            <Link href={`/tools/${t.key}`} target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
              <ExternalLink className="h-3.5 w-3.5" /> Open /tools/{t.key}
            </Link>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-zinc-500">Paste this link into a note:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-700">{snippet(t.key, t.name)}</code>
              <button onClick={() => copy(t.key, snippet(t.key, t.name))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                {copied === t.key ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
