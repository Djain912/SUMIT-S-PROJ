// Market Desk insights from NSE's public MCP server:
//   • index valuations — P/E, P/B and dividend-yield percentiles within NSE's
//     ~2-year window
//   • sector P/E map (cheapest → priciest Nifty sector)
//   • India VIX context (level, 1-month change, 1-year percentile)
//   • the month's (or, at week's end, the week's) extremes across NSE indices
//   • Nifty heavyweights vs the Nifty 50 over 12 months
//   • the sector scoreboard rows (real Nifty sector indices)

import { NseMcp } from '@/lib/nse/mcp';
import type { Series } from './fetch-market-data';
import { lineCard, type Insight } from './insights';
import { fmtDay, fmtMonthYear, fmtPct } from './stats';

const SOURCE = 'NSE (via NSE MCP)';

type Stat = { current: number; min: number; min_date: string; max: number; max_date: string; median: number; percentile: number; observations: number };
type Valuation = { index: string; date: string; close: number; pe: Stat; pb: Stat; div_yield_pct?: Stat; window_from: string; window_to: string };
type Mover = { index: string; return_pct: number };
type Movers = { date: string; period: string; base_date: string; indices_ranked: number; gainers: Mover[]; losers: Mover[] };
type Compared = { date: string; base_date: string; indices: { index: string; return_pct: number; pe: number; volatility_annualised_pct?: number }[] };
type Vix = { level: number; change_1d_pct: number; vs_1m_ago?: { change_pct: number; base_level: number; base_date: string }; range?: { min: number; max: number; mean: number; percentile: number; window_from: string } };
type Mood = { date: string; india_vix?: Vix };
export type Relative = { symbol: string; stockReturn: number; indexReturn: number; outperformance: number; date: string };

export type NseData = {
  valuations: Valuation[];
  movers: Movers | null;
  weekMovers: Movers | null;
  sectors: Compared | null;
  mood: Mood | null;
  heavyweights: Relative[];
};

const VALUATION_INDICES = [
  'NIFTY 50', 'NIFTY BANK', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 100', 'NIFTY IT',
  'NIFTY FMCG', 'NIFTY PHARMA', 'NIFTY AUTO', 'NIFTY METAL', 'NIFTY REALTY',
];
const SECTOR_INDICES = [
  ['Nifty Bank', 'Nifty IT', 'Nifty Auto', 'Nifty Pharma', 'Nifty FMCG', 'Nifty Metal', 'Nifty Realty', 'Nifty Energy', 'Nifty PSU Bank', 'Nifty Financial Services'],
  ['Nifty Media', 'Nifty Healthcare Index', 'Nifty Oil & Gas', 'Nifty Consumer Durables', 'Nifty Private Bank'],
];
// Nifty 50's largest constituents — their moves explain most of the index's.
const HEAVYWEIGHTS: [string, string][] = [
  ['HDFCBANK', 'HDFC Bank'], ['ICICIBANK', 'ICICI Bank'], ['RELIANCE', 'Reliance'], ['INFY', 'Infosys'],
  ['BHARTIARTL', 'Bharti Airtel'], ['LT', 'L&T'], ['ITC', 'ITC'], ['TCS', 'TCS'], ['SBIN', 'SBI'],
  ['AXISBANK', 'Axis Bank'], ['KOTAKBANK', 'Kotak Bank'], ['M&M', 'M&M'],
];
const HEAVY_NAME = new Map(HEAVYWEIGHTS);

/** Pull a number from a tool response whose key matches all the given fragments. */
function pickNum(obj: unknown, ...frags: string[]): number | null {
  const stack: unknown[] = [obj];
  while (stack.length) {
    const o = stack.pop();
    if (!o || typeof o !== 'object') continue;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (typeof v === 'number' && frags.every((f) => key.includes(f))) return v;
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}

/** Fetch everything the NSE insights need. Never throws — a failure just means fewer posts. */
export async function fetchNseData(): Promise<NseData> {
  const out: NseData = { valuations: [], movers: null, weekMovers: null, sectors: null, mood: null, heavyweights: [] };
  const mcp = new NseMcp();
  try {
    await mcp.ensure(); // fail fast (8 s) if NSE's server is down — never stall the run
  } catch (e) {
    console.warn('[market-desk] NSE MCP unreachable, skipping NSE posts:', (e as Error).message);
    return out;
  }
  const settle = async <T,>(p: Promise<T>) => p.catch((e) => { console.warn('[market-desk] NSE MCP call failed:', (e as Error).message); return null; });
  const [vals, movers, weekMovers, mood, sectorParts, rel] = await Promise.all([
    Promise.all(VALUATION_INDICES.map((ix) => settle(mcp.call<Valuation>('get_index_valuation', { indexName: ix, months: 24 })))),
    settle(mcp.call<Movers>('get_index_movers', { period: '1M', n: 6 })),
    settle(mcp.call<Movers>('get_index_movers', { period: '1W', n: 6 })),
    settle(mcp.call<Mood>('get_market_mood', {})),
    Promise.all(SECTOR_INDICES.map((names) => settle(mcp.call<Compared>('compare_indices', { indexNames: names, months: 1 })))),
    Promise.all(HEAVYWEIGHTS.map(([sym]) => settle(mcp.call<Record<string, unknown>>('get_stock_vs_index', { symbol: sym, indexName: 'NIFTY 50', months: 12 })))),
  ]);
  out.valuations = vals.filter((v): v is Valuation => !!v?.pe);
  out.movers = movers;
  out.weekMovers = weekMovers;
  out.mood = mood;
  const ok = sectorParts.filter((c): c is Compared => !!c?.indices);
  if (ok.length) out.sectors = { ...ok[0], indices: ok.flatMap((c) => c.indices) };
  out.heavyweights = rel.flatMap((r, i) => {
    if (!r) return [];
    const stockReturn = pickNum(r, 'stock', 'return');
    const indexReturn = pickNum(r, 'index', 'return');
    const outperf = pickNum(r, 'outperform') ?? (stockReturn != null && indexReturn != null ? stockReturn - indexReturn : null);
    if (stockReturn == null || indexReturn == null || outperf == null) return [];
    return [{ symbol: HEAVYWEIGHTS[i][0], stockReturn, indexReturn, outperformance: outperf, date: String(r.date ?? '') }];
  });
  console.log(`[market-desk] NSE MCP: ${out.valuations.length} valuations, movers ${!!out.movers}/${!!out.weekMovers}, sectors ${out.sectors?.indices.length ?? 0}, vix ${!!out.mood?.india_vix}, heavyweights ${out.heavyweights.length}`);
  return out;
}

const pretty = (s: string) => s.replace(/^NIFTY\b/i, 'Nifty').replace(/\bMIDCAP\b/i, 'Midcap').replace(/\bSMALLCAP\b/i, 'Smallcap')
  .replace(/\b(BANK|PHARMA|FMCG|AUTO|METAL|REALTY)\b/g, (w) => (w === 'FMCG' ? w : w[0] + w.slice(1).toLowerCase()));

// ── Valuation extremes: P/E, P/B, dividend yield ───────────────────────────

type MetricKey = 'pe' | 'pb' | 'div_yield_pct';
const METRIC: Record<MetricKey, { label: string; short: string; fmt: (v: number) => string; cheapWhenHigh: boolean }> = {
  pe: { label: 'price-to-earnings ratio', short: 'P/E', fmt: (v) => `${v.toFixed(1)}×`, cheapWhenHigh: false },
  pb: { label: 'price-to-book ratio', short: 'P/B', fmt: (v) => `${v.toFixed(2)}×`, cheapWhenHigh: false },
  div_yield_pct: { label: 'dividend yield', short: 'dividend yield', fmt: (v) => `${v.toFixed(2)}%`, cheapWhenHigh: true },
};

function valuationInsight(vals: Valuation[]): Insight | null {
  if (vals.length < 4) return null;
  // The single most extreme reading across indices and metrics.
  const cands = vals.flatMap((v) => (['pe', 'pb', 'div_yield_pct'] as MetricKey[])
    .filter((m) => v[m]?.percentile != null)
    .map((m) => ({ v, m, stat: v[m] as Stat })));
  if (!cands.length) return null;
  const best = cands.sort((a, b) => Math.abs(b.stat.percentile - 50) - Math.abs(a.stat.percentile - 50))[0];
  const { v, m, stat } = best;
  const p = stat.percentile;
  if (p > 8 && p < 92) return null;
  const meta = METRIC[m];
  const name = pretty(v.index);
  const since = fmtMonthYear(v.window_from);
  const high = p >= 50;
  const cheap = meta.cheapWhenHigh ? high : !high;
  const share = high ? p.toFixed(1) : (100 - p).toFixed(1);
  const atExtreme = high ? stat.current >= stat.max : stat.current <= stat.min;
  const facts = [
    `${name}'s ${meta.label} is ${meta.fmt(stat.current)}${atExtreme ? `, its ${high ? 'highest' : 'lowest'} since at least ${since}` : ''}.`,
    `It was ${high ? 'lower' : 'higher'} on ${share}% of trading days since ${since}; the median over that period is ${meta.fmt(stat.median)}.`,
    `By this measure the index looks ${cheap ? 'cheaper' : 'richer'} than usual for the period.`,
  ];
  const items = vals.filter((x) => x[m]?.percentile != null)
    .map((x) => ({ label: pretty(x.index), value: (x[m] as Stat).percentile }))
    .sort((a, b) => a.value - b.value);
  return {
    key: `valuation:${m}:${v.index}:${high ? 'high' : 'low'}`,
    category: 'valuation',
    symbol: `valuation:${v.index}`,
    score: 60 + Math.abs(p - 50) * 0.4 + (atExtreme ? 8 : 0) + (m === 'pe' ? 2 : 0),
    facts,
    tweet: `${facts[0]}\n\n${facts[1]}`,
    card: {
      kicker: `Valuation · ${name}`,
      headline: `${name}'s ${meta.short} of ${meta.fmt(stat.current)} is ${high ? 'higher' : 'lower'} than on ${share}% of days since ${since}`,
      subtitle: `Where each index's ${meta.short} sits within its own range since ${since} (0% = lowest, 100% = highest).`,
      keyStat: { value: meta.fmt(stat.current), label: `${meta.short} · median since ${since}: ${meta.fmt(stat.median)}` },
      chart: { kind: 'hbars', items, format: 'share' },
      source: SOURCE,
      asOf: fmtDay(v.date),
    },
  };
}

// ── Sector P/E map ─────────────────────────────────────────────────────────

const sectorLabel = (s: string) => s.replace(/^Nifty /, '').replace(' Index', '').replace('Financial Services', 'Fin Services');

function sectorPeInsight(c: Compared | null, now: Date): Insight | null {
  const rows = (c?.indices ?? []).filter((i) => i.pe > 0).map((i) => ({ label: sectorLabel(i.index), value: i.pe })).sort((a, b) => a.value - b.value);
  if (rows.length < 8) return null;
  const lo = rows[0];
  const hi = rows[rows.length - 1];
  const weekend = [0, 6].includes(now.getUTCDay());
  return {
    key: 'sector-pe',
    category: 'sector-pe',
    symbol: 'sector-pe',
    score: 52 + (weekend ? 12 : 0) + Math.min(hi.value / lo.value, 10),
    facts: [
      `Among Nifty sector indices, ${lo.label} trades at the lowest price-to-earnings ratio (${lo.value.toFixed(1)}×) and ${hi.label} at the highest (${hi.value.toFixed(1)}×).`,
      `Middle of the pack: ${rows[Math.floor(rows.length / 2)].label} at ${rows[Math.floor(rows.length / 2)].value.toFixed(1)}×.`,
    ],
    tweet: `Nifty sectors by P/E, cheapest to priciest:\n\n${rows.slice(0, 3).map((r) => `${r.label} ${r.value.toFixed(1)}×`).join('\n')}\n…\n${rows.slice(-3).map((r) => `${r.label} ${r.value.toFixed(1)}×`).join('\n')}`,
    card: {
      kicker: 'Sector valuations · India',
      headline: `${lo.label} is the cheapest Nifty sector at ${lo.value.toFixed(1)}× earnings; ${hi.label} the priciest at ${hi.value.toFixed(1)}×`,
      subtitle: 'Trailing price-to-earnings ratio of each Nifty sector index, as published by NSE.',
      chart: { kind: 'hbars', items: rows, format: 'mult' },
      source: SOURCE,
      asOf: fmtDay(c!.date),
    },
  };
}

// ── India VIX context ──────────────────────────────────────────────────────

function vixInsight(mood: Mood | null, vixSeries?: Series): Insight | null {
  const v = mood?.india_vix;
  if (!v?.range || !vixSeries) return null;
  const pctl = v.range.percentile;
  const m1 = v.vs_1m_ago?.change_pct ?? 0;
  if (!(pctl >= 85 || pctl <= 10 || Math.abs(m1) >= 25)) return null;
  const n = vixSeries.closes.length;
  const facts = [
    `India VIX closed at ${v.level.toFixed(2)}${v.vs_1m_ago ? `, ${fmtPct(m1)} from ${v.vs_1m_ago.base_level.toFixed(2)} a month ago` : ''}.`,
    `Over the past year it ranged from ${v.range.min.toFixed(2)} to ${v.range.max.toFixed(2)} (average ${v.range.mean.toFixed(2)}); it closed lower on ${pctl.toFixed(1)}% of days.`,
    'India VIX measures the options market’s expected Nifty volatility over the next 30 days.',
  ];
  const elevated = pctl >= 50;
  return {
    key: `vix-context:${elevated ? 'high' : 'low'}`,
    category: 'vix',
    symbol: '^INDIAVIX',
    score: 58 + Math.abs(pctl - 50) * 0.3 + Math.min(Math.abs(m1), 60) * 0.2,
    facts,
    tweet: `${facts[0]}\n\n${facts[1]}`,
    card: {
      kicker: 'Volatility · India VIX',
      headline: Math.abs(m1) >= 25
        ? `India VIX is ${fmtPct(m1, 0)} in a month to ${v.level.toFixed(1)}, ${elevated ? 'above' : 'below'} ${pctl.toFixed(0)}% of the past year's readings`
        : `India VIX at ${v.level.toFixed(1)} is ${elevated ? 'higher' : 'lower'} than on ${(elevated ? pctl : 100 - pctl).toFixed(0)}% of days in the past year`,
      subtitle: `Dashed line: the past year's average of ${v.range.mean.toFixed(1)}. India VIX tracks expected Nifty volatility.`,
      keyStat: { value: v.level.toFixed(1), label: `India VIX · ${pctl.toFixed(0)}th percentile of the past year` },
      chart: lineCard({ dates: vixSeries.dates, values: vixSeries.closes, unit: 'level' }, n - 252, { refLines: [{ value: v.range.mean, label: `1-year average ${v.range.mean.toFixed(1)}` }] }),
      source: `${SOURCE}; chart via Yahoo Finance`,
      asOf: fmtDay(mood!.date),
    },
  };
}

// ── NSE index movers (month, or the week at week's end) ─────────────────────

/** Friday after the close, or the weekend (IST). */
function weekEnd(now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const day = ist.getUTCDay();
  return (day === 5 && ist.getUTCHours() >= 16) || day === 6 || day === 0;
}

function moversInsight(m: Movers | null, now: Date, weekly: boolean): Insight | null {
  if (!m || m.gainers.length < 3 || m.losers.length < 3) return null;
  const g = m.gainers.slice(0, 5);
  const l = m.losers.slice(0, 5);
  const top = g[0];
  const bottom = l[0];
  const spread = top.return_pct - bottom.return_pct;
  const weekend = [0, 1, 6].includes(now.getUTCDay());
  const period = weekly ? 'week' : 'month';
  return {
    key: `index-movers:${weekly ? '1W' : '1M'}`,
    category: 'index-movers',
    symbol: 'nse-indices',
    score: weekly ? 74 + Math.min(spread, 20) * 0.3 : 48 + Math.min(spread, 30) * 0.6 + (weekend ? 8 : 0),
    facts: [
      `Over the past ${period}, ${top.index} was the best performer among ${m.indices_ranked} NSE equity indices (${fmtPct(top.return_pct)}), and ${bottom.index} the worst (${fmtPct(bottom.return_pct)}).`,
      `Other leaders: ${g.slice(1, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join(', ')}. Other laggards: ${l.slice(1, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join(', ')}.`,
    ],
    tweet: `${weekly ? 'The week in NSE indices' : `Best and worst of ${m.indices_ranked} NSE indices, past month`}:\n\n${g.slice(0, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join('\n')}\n…\n${l.slice(0, 3).map((x) => `${x.index} ${fmtPct(x.return_pct)}`).join('\n')}`,
    card: {
      kicker: `${weekly ? 'Weekly wrap' : 'Index movers'} · ${m.indices_ranked} NSE indices`,
      headline: weekly
        ? `The week in NSE indices: ${top.index} ${fmtPct(top.return_pct)}, ${bottom.index} ${fmtPct(bottom.return_pct)}`
        : `${top.index} ${fmtPct(top.return_pct)}, ${bottom.index} ${fmtPct(bottom.return_pct)}: the month's extremes across NSE indices`,
      subtitle: `Top 5 and bottom 5 of ${m.indices_ranked} NSE equity indices by ${weekly ? 'one-week' : 'one-month'} return.`,
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

// ── Heavyweights vs the Nifty ──────────────────────────────────────────────

function heavyweightsInsight(rows: Relative[], now: Date): Insight | null {
  if (rows.length < 8) return null;
  const sorted = [...rows].sort((a, b) => b.outperformance - a.outperformance);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const nifty = rows[0].indexReturn;
  const name = (s: string) => HEAVY_NAME.get(s) ?? s;
  const pts = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} pts`;
  const beat = rows.filter((r) => r.outperformance > 0).length;
  const weekend = [0, 6].includes(now.getUTCDay());
  return {
    key: 'heavyweights:12m',
    category: 'heavyweights',
    symbol: 'heavyweights',
    score: 52 + (weekend ? 12 : 0) + Math.min(top.outperformance - bottom.outperformance, 60) * 0.2,
    facts: [
      `Over the past 12 months the Nifty 50 returned ${fmtPct(nifty)}. ${beat} of its ${rows.length} largest stocks beat it.`,
      `Best relative performer: ${name(top.symbol)} (${fmtPct(top.stockReturn)}, ${pts(top.outperformance)} vs the index). Worst: ${name(bottom.symbol)} (${fmtPct(bottom.stockReturn)}, ${pts(bottom.outperformance)}).`,
    ],
    tweet: `Nifty heavyweights vs the Nifty 50, past 12 months (index ${fmtPct(nifty)}):\n\n${sorted.slice(0, 3).map((r) => `${name(r.symbol)} ${pts(r.outperformance)}`).join('\n')}\n…\n${sorted.slice(-3).map((r) => `${name(r.symbol)} ${pts(r.outperformance)}`).join('\n')}`,
    card: {
      kicker: 'Heavyweights · Nifty 50',
      headline: `${beat} of the Nifty's ${rows.length} biggest stocks beat the index over 12 months; ${name(top.symbol)} leads by ${pts(top.outperformance).replace('+', '')}`,
      subtitle: `12-month return of each stock minus the Nifty 50's ${fmtPct(nifty)}, in percentage points.`,
      chart: { kind: 'hbars', items: sorted.map((r) => ({ label: name(r.symbol), value: r.outperformance })), format: 'pts' },
      source: SOURCE,
      asOf: fmtDay(rows[0].date || new Date().toISOString().slice(0, 10)),
    },
  };
}

/** Sector scoreboard rows from the real Nifty sector indices (preferred over ETF proxies). */
export function nseSectorRows(d: NseData): { rows: { label: string; m1: number }[]; asOf: string } | null {
  if (!d.sectors || d.sectors.indices.length < 8) return null;
  return { rows: d.sectors.indices.map((i) => ({ label: sectorLabel(i.index), m1: i.return_pct })), asOf: d.sectors.date };
}

export function detectNseInsights(d: NseData, now: Date, vix?: Series): Insight[] {
  const weekly = weekEnd(now);
  return [
    valuationInsight(d.valuations),
    sectorPeInsight(d.sectors, now),
    vixInsight(d.mood, vix),
    weekly ? moversInsight(d.weekMovers, now, true) ?? moversInsight(d.movers, now, false) : moversInsight(d.movers, now, false),
    heavyweightsInsight(d.heavyweights, now),
  ].filter((i): i is Insight => i !== null);
}
