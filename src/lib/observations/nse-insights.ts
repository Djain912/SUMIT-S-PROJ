// Market Desk insights from NSE's public MCP server: index valuations (P/E
// percentile within NSE's ~2-year window), the biggest movers among all NSE
// indices, and a sector scoreboard built from the real Nifty sector indices.

import { NseMcp } from '@/lib/nse/mcp';
import type { Insight } from './insights';
import { fmtDay, fmtMonthYear, fmtPct } from './stats';

const SOURCE = 'NSE (via NSE MCP)';

type Stat = { current: number; min: number; min_date: string; max: number; max_date: string; median: number; percentile: number; observations: number };
type Valuation = { index: string; date: string; close: number; pe: Stat; pb: Stat; window_from: string; window_to: string };
type Mover = { index: string; return_pct: number };
type Movers = { date: string; period: string; base_date: string; indices_ranked: number; gainers: Mover[]; losers: Mover[] };
type Compared = { date: string; base_date: string; indices: { index: string; return_pct: number; pe: number }[] };

export type NseData = { valuations: Valuation[]; movers: Movers | null; sectors: Compared | null };

const VALUATION_INDICES = [
  'NIFTY 50', 'NIFTY BANK', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 100', 'NIFTY IT',
  'NIFTY FMCG', 'NIFTY PHARMA', 'NIFTY AUTO', 'NIFTY METAL', 'NIFTY REALTY',
];
const SECTOR_INDICES = [
  ['Nifty Bank', 'Nifty IT', 'Nifty Auto', 'Nifty Pharma', 'Nifty FMCG', 'Nifty Metal', 'Nifty Realty', 'Nifty Energy', 'Nifty PSU Bank', 'Nifty Financial Services'],
  ['Nifty Media', 'Nifty Healthcare Index', 'Nifty Oil & Gas', 'Nifty Consumer Durables', 'Nifty Private Bank'],
];

/** Fetch everything the NSE insights need. Never throws — a failure just means fewer posts. */
export async function fetchNseData(): Promise<NseData> {
  const out: NseData = { valuations: [], movers: null, sectors: null };
  try {
    const mcp = new NseMcp();
    const vals = await Promise.allSettled(VALUATION_INDICES.map((ix) => mcp.call<Valuation>('get_index_valuation', { indexName: ix, months: 24 })));
    out.valuations = vals.flatMap((v) => (v.status === 'fulfilled' && v.value?.pe ? [v.value] : []));
    out.movers = await mcp.call<Movers>('get_index_movers', { period: '1M', n: 6 }).catch(() => null);
    const parts = await Promise.allSettled(SECTOR_INDICES.map((names) => mcp.call<Compared>('compare_indices', { indexNames: names, months: 1 })));
    const ok = parts.flatMap((p) => (p.status === 'fulfilled' ? [p.value] : []));
    if (ok.length) out.sectors = { ...ok[0], indices: ok.flatMap((c) => c.indices) };
  } catch (e) {
    console.warn('[market-desk] NSE MCP unavailable:', e);
  }
  console.log(`[market-desk] NSE MCP: ${out.valuations.length} valuations, movers ${!!out.movers}, sectors ${out.sectors?.indices.length ?? 0}`);
  return out;
}

const pretty = (s: string) => s.replace(/^NIFTY\b/i, 'Nifty').replace(/\bMIDCAP\b/i, 'Midcap').replace(/\bSMALLCAP\b/i, 'Smallcap')
  .replace(/\b(BANK|PHARMA|FMCG|AUTO|METAL|REALTY)\b/g, (w) => (w === 'FMCG' ? w : w[0] + w.slice(1).toLowerCase()));

function valuationInsight(vals: Valuation[]): Insight | null {
  if (vals.length < 4) return null;
  const extreme = [...vals].sort((a, b) => Math.abs(b.pe.percentile - 50) - Math.abs(a.pe.percentile - 50))[0];
  const p = extreme.pe.percentile;
  if (p > 8 && p < 92) return null;
  const cheap = p <= 50;
  const name = pretty(extreme.index);
  const since = fmtMonthYear(extreme.window_from);
  const share = cheap ? (100 - p).toFixed(1) : p.toFixed(1);
  const atExtreme = cheap ? extreme.pe.current <= extreme.pe.min : extreme.pe.current >= extreme.pe.max;
  const facts = [
    `${name}'s price-to-earnings ratio is ${extreme.pe.current.toFixed(1)}${atExtreme ? `, its ${cheap ? 'lowest' : 'highest'} since at least ${since}` : ''}.`,
    `It was ${cheap ? 'higher' : 'lower'} on ${share}% of trading days since ${since}; the median over that period is ${extreme.pe.median.toFixed(1)}.`,
    `Its ${cheap ? 'high' : 'low'} in that window was ${(cheap ? extreme.pe.max : extreme.pe.min).toFixed(1)} in ${fmtMonthYear(cheap ? extreme.pe.max_date : extreme.pe.min_date)}.`,
  ];
  const items = vals.map((v) => ({ label: pretty(v.index), value: v.pe.percentile })).sort((a, b) => a.value - b.value);
  return {
    key: `valuation:${extreme.index}:${cheap ? 'cheap' : 'rich'}`,
    category: 'valuation',
    symbol: `valuation:${extreme.index}`,
    score: 60 + Math.abs(p - 50) * 0.4 + (atExtreme ? 8 : 0),
    facts,
    tweet: `${facts[0]}\n\n${facts[1]}`,
    card: {
      kicker: `Valuation · ${name}`,
      headline: `${name} trades at ${extreme.pe.current.toFixed(1)}× earnings, ${cheap ? 'cheaper' : 'richer'} than on ${share}% of days since ${since}`,
      subtitle: `Where each index's P/E sits within its own range since ${since} (0% = cheapest, 100% = richest).`,
      keyStat: { value: `${extreme.pe.current.toFixed(1)}×`, label: `P/E · median since ${since}: ${extreme.pe.median.toFixed(1)}×` },
      chart: { kind: 'hbars', items, format: 'share' },
      source: SOURCE,
      asOf: fmtDay(extreme.date),
    },
  };
}

function moversInsight(m: Movers | null, now: Date): Insight | null {
  if (!m || m.gainers.length < 3 || m.losers.length < 3) return null;
  const g = m.gainers.slice(0, 5);
  const l = m.losers.slice(0, 5);
  const top = g[0];
  const bottom = l[0];
  const spread = top.return_pct - bottom.return_pct;
  const weekend = [0, 1, 6].includes(now.getUTCDay());
  return {
    key: 'index-movers:1M',
    category: 'index-movers',
    symbol: 'nse-indices',
    score: 48 + Math.min(spread, 30) * 0.6 + (weekend ? 8 : 0),
    facts: [
      `Over the past month, ${top.index} was the best performer among ${m.indices_ranked} NSE equity indices (${fmtPct(top.return_pct)}), and ${bottom.index} the worst (${fmtPct(bottom.return_pct)}).`,
      `Other leaders: ${g.slice(1, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join(', ')}. Other laggards: ${l.slice(1, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join(', ')}.`,
    ],
    tweet: `Best and worst of ${m.indices_ranked} NSE indices, past month:\n\n${g.slice(0, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join('\n')}\n…\n${l.slice(0, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join('\n')}`,
    card: {
      kicker: `Index movers · ${m.indices_ranked} NSE indices`,
      headline: `${top.index} ${fmtPct(top.return_pct)}, ${bottom.index} ${fmtPct(bottom.return_pct)}: the month's extremes across NSE indices`,
      subtitle: `Top 5 and bottom 5 of ${m.indices_ranked} NSE equity indices by one-month return.`,
      chart: {
        kind: 'hbars',
        items: [...g, ...[...l].reverse()].map((x) => ({ label: x.index.replace(/^Nifty /, '').slice(0, 24), value: x.return_pct })),
        format: 'pct',
      },
      source: SOURCE,
      asOf: fmtDay(m.date),
    },
  };
}

/** Sector scoreboard rows from the real Nifty sector indices (preferred over ETF proxies). */
export function nseSectorRows(d: NseData): { rows: { label: string; m1: number }[]; asOf: string } | null {
  if (!d.sectors || d.sectors.indices.length < 8) return null;
  const rows = d.sectors.indices.map((i) => ({
    label: i.index.replace(/^Nifty /, '').replace(' Index', '').replace('Financial Services', 'Fin Services'),
    m1: i.return_pct,
  }));
  return { rows, asOf: d.sectors.date };
}

export function detectNseInsights(d: NseData, now: Date): Insight[] {
  return [valuationInsight(d.valuations), moversInsight(d.movers, now)].filter((i): i is Insight => i !== null);
}
