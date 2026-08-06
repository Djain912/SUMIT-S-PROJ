'use client';

import { useState } from 'react';
import { Instagram, TrendingUp } from 'lucide-react';
import { StudioClient } from './StudioClient';
import { FiiDiiReportClient } from './FiiDiiReportClient';

const TABS = [
  { key: 'content', label: 'Content Studio', icon: Instagram,
    desc: 'Generate the daily carousel, preview it, and download print-ready PNGs. Themes and layouts rotate automatically so the feed never looks repetitive.' },
  { key: 'reports', label: 'Market Reports', icon: TrendingUp,
    desc: 'Weekly and monthly FII/DII cash-flow and sector snapshots, built from real data — nothing here is AI-written.' },
] as const;

export function StudioTabs({ logoUrl }: { logoUrl?: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('content');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-zinc-900">
          <active.icon className="h-5 w-5" />
          <h1 className="text-xl font-semibold tracking-tight">Social Studio</h1>
        </div>
        <p className="mt-1.5 text-sm text-zinc-500">{active.desc}</p>
      </header>

      <div className="flex gap-2 border-b border-zinc-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition ${
              tab === t.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'content' ? <StudioClient logoUrl={logoUrl} /> : <FiiDiiReportClient />}
    </div>
  );
}
