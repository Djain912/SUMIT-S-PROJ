// Market Desk breadth insights from the BreadthDaily series (Nifty 500, built
// from NSE bhavcopy files): % of stocks above key moving averages, golden-cross
// share, 52-week highs/lows, daily advance share, McClellan Oscillator,
// index-vs-breadth divergences and sector breadth.

import type { Series, Unit } from './fetch-market-data';
import type { CardSpec } from './card-svg';
import { lineCard, type Insight } from './insights';
import { fmtDay, fmtMonthYear, fmtPct, fmtValue, forwardStudy, lastIndexWhere, pct, percentileRank, yearsBetween } from './stats';

export type BreadthPoint = {
  date: string;
  stocks: number;
  advances: number;
  declines: number;
  pctAbove20: number | null;
  pctAbove50: number | null;
  pctAbove200: number | null;
  pctGolden: number | null;
  newHighs: number | null;
  newLows: number | null;
  mcclellan: number;
  sectors: { name: string; stocks: number; pctAbove200: number; pctAbove50: number }[] | null;
};

const SOURCE = 'NSE bhavcopy · current Nifty 500 constituents';
const last = <T,>(a: T[]) => a[a.length - 1];

type MetricDef = {
  id: string;
  short: string;                       // kicker + chart label
  noun: string;                        // "share of Nifty 500 stocks above their 200-day average"
  unit: Unit;
  get: (r: BreadthPoint) => number | null;
  sides: 'both' | 'high';              // 'high': only a high reading is news (e.g. new lows)
  gate?: (v: number) => boolean;       // extra condition before posting
  ref?: { value: number; label: string };
  explain: string;
  weight: number;
  headline: (v: string, high: boolean, since: string) => string;
};

const METRICS: MetricDef[] = [
  {
    id: 'above200', short: 'Above 200-day', noun: 'share of Nifty 500 stocks above their 200-day average', unit: 'pct',
    get: (r) => r.pctAbove200, sides: 'both', ref: { value: 50, label: '50%' }, headline: (v, high, since) => `${high ? '' : 'Only '}${v} of Nifty 500 stocks are above their 200-day average, the ${high ? 'most' : 'fewest'} ${since}`,
    weight: 12,
    explain: 'The 200-day average is the classic long-term trend line; this shows how many stocks are in long-term uptrends.',
  },
  {
    id: 'above50', short: 'Above 50-day', noun: 'share of Nifty 500 stocks above their 50-day average', unit: 'pct',
    get: (r) => r.pctAbove50, sides: 'both', ref: { value: 50, label: '50%' }, headline: (v, high, since) => `${high ? '' : 'Only '}${v} of Nifty 500 stocks are above their 50-day average, the ${high ? 'most' : 'fewest'} ${since}`,
    weight: 8,
    explain: 'Readings below 20% are commonly read as oversold breadth, above 80% as overbought.',
  },
  {
    id: 'golden', short: 'Golden-cross share', noun: 'share of Nifty 500 stocks whose 50-day average is above their 200-day', unit: 'pct',
    get: (r) => r.pctGolden, sides: 'both', ref: { value: 50, label: '50%' }, headline: (v, high, since) => `${high ? '' : 'Only '}${v} of Nifty 500 stocks are in a golden cross, the ${high ? 'most' : 'fewest'} ${since}`,
    weight: 6,
    explain: 'A 50-day average above the 200-day (a golden-cross state) marks a stock in an established uptrend.',
  },
  {
    id: 'newlows', short: '52-week lows', noun: 'number of Nifty 500 stocks closing at a 52-week low', unit: 'count',
    get: (r) => r.newLows, sides: 'high', gate: (v) => v >= 25, headline: (v, _h, since) => `${v} Nifty 500 stocks closed at 52-week lows, the most ${since}`,
    weight: 10,
    explain: 'Counts stocks closing below every close of the previous 52 weeks.',
  },
  {
    id: 'newhighs', short: '52-week highs', noun: 'number of Nifty 500 stocks closing at a 52-week high', unit: 'count',
    get: (r) => r.newHighs, sides: 'high', gate: (v) => v >= 25, headline: (v, _h, since) => `${v} Nifty 500 stocks closed at 52-week highs, the most ${since}`,
    weight: 8,
    explain: 'Counts stocks closing above every close of the previous 52 weeks.',
  },
  {
    id: 'advshare', short: 'Daily breadth', noun: 'share of Nifty 500 stocks that rose on the day', unit: 'pct',
    get: (r) => (r.stocks ? (r.advances / r.stocks) * 100 : null), sides: 'both', gate: (v) => v <= 15 || v >= 85, headline: (v, high, since) => high ? `${v} of Nifty 500 stocks rose today, the broadest advance ${since}` : `Only ${v} of Nifty 500 stocks rose today, the weakest breadth ${since}`,
    weight: 10,
    explain: 'One-day breadth: lopsided readings show selling or buying across the whole market, not just a few heavyweights.',
  },
  {
    id: 'mcclellan', short: 'McClellan Oscillator', noun: 'McClellan Oscillator for the Nifty 500', unit: 'level',
    get: (r) => r.mcclellan, sides: 'both', ref: { value: 0, label: 'Zero line' }, headline: (v, high, since) => `The Nifty 500 McClellan Oscillator is at ${v}, its ${high ? 'highest' : 'lowest'} reading ${since}`,
    weight: 6,
    explain: 'The 19-day minus 39-day exponential average of daily advances minus declines — a classic breadth momentum gauge.',
  },
];

const fmtM = (d: MetricDef, v: number) => (d.unit === 'level' ? `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}` : fmtValue(v, d.unit));

function metricInsight(def: MetricDef, rows: BreadthPoint[], nifty?: Series): Insight | null {
  const pts = rows.map((r) => ({ date: r.date, v: def.get(r) })).filter((p): p is { date: string; v: number } => p.v != null && Number.isFinite(p.v));
  if (pts.length < 120) return null;
  const n = pts.length;
  const v = pts[n - 1].v;
  if (def.gate && !def.gate(v)) return null;
  const vals = pts.map((p) => p.v);
  const p = percentileRank(vals.slice(0, -1), v);
  const high = def.sides === 'high' ? true : p >= 50;
  if (def.sides === 'high' && p < 90) return null;

  const prevIdx = lastIndexWhere(n, n - 1, (i) => (high ? vals[i] >= v : vals[i] <= v));
  const asOf = pts[n - 1].date;
  const gapYears = prevIdx < 0 ? yearsBetween(pts[0].date, asOf) : yearsBetween(pts[prevIdx].date, asOf);
  if (prevIdx >= 0 && gapYears < 0.25) return null; // "highest since last month" isn't a story
  const firstMonth = fmtMonthYear(pts[0].date);
  const sinceText = prevIdx < 0
    ? `the ${high ? 'highest' : 'lowest'} in our data (since ${firstMonth})`
    : `the ${high ? 'highest' : 'lowest'} since ${fmtMonthYear(pts[prevIdx].date)}`;
  const sinceShort = prevIdx < 0 ? `in our data (since ${firstMonth})` : `since ${fmtMonthYear(pts[prevIdx].date)}`;

  const facts = [
    `The ${def.noun} is ${fmtM(def, v)} — ${sinceText}.`,
    def.explain,
  ];
  if (def.unit === 'pct' && def.id !== 'advshare') {
    const back = pts[Math.max(0, n - 22)].v;
    facts.push(`A month ago it was ${fmtM(def, back)}.`);
  }

  // What did the Nifty do next, after comparable readings?
  let keyStat: CardSpec['keyStat'] = { value: fmtM(def, v), label: def.short.toLowerCase() };
  if (nifty) {
    const pos = new Map(nifty.dates.map((d, i) => [d, i]));
    const triggers: number[] = [];
    for (let i = 1; i < n - 1; i++) {
      const hit = high ? vals[i] >= v : vals[i] <= v;
      const was = high ? vals[i - 1] >= v : vals[i - 1] <= v;
      const t = pos.get(pts[i].date);
      if (hit && !was && t != null) triggers.push(t);
    }
    const st = forwardStudy(nifty.closes, nifty.dates, triggers, 21);
    if (st.n >= 5) {
      facts.push(`After the previous ${st.n} readings this ${high ? 'high' : 'low'} since ${firstMonth}, the Nifty 50 was higher a month later ${st.up} times (median ${fmtPct(st.median)}).`);
      keyStat = { value: `${st.up} of ${st.n}`, label: `times the Nifty was higher a month after a reading like this` };
    }
  }

  const headline = def.headline(def.unit === 'pct' ? `${v.toFixed(0)}%` : fmtM(def, v), high, sinceShort);
  const extremeness = Math.abs(p - 50) * 2;
  return {
    key: `breadth:${def.id}:${high ? 'high' : 'low'}`,
    category: 'breadth',
    symbol: `breadth:${def.id}`,
    score: 52 + def.weight + Math.min(gapYears, 2) * 8 + extremeness * 0.1,
    facts,
    tweet: `${facts[0]}\n\n${facts[2] ?? def.explain}`,
    card: {
      kicker: `Market breadth · ${def.short}`,
      headline,
      subtitle: def.explain,
      keyStat,
      chart: lineCard(
        { dates: pts.map((x) => x.date), values: vals, unit: def.unit },
        def.id === 'advshare' ? n - 125 : 0, // daily readings are noisy — show ~6 months
        {
          refLines: def.ref ? [def.ref] : undefined,
          markers: prevIdx >= 0 ? [{ idx: prevIdx, label: fmtMonthYear(pts[prevIdx].date) }] : undefined,
        },
      ),
      source: SOURCE,
      asOf: fmtDay(asOf),
    },
  };
}

/** Index near its high while most stocks aren't (or the reverse). */
function divergenceInsight(rows: BreadthPoint[], nifty?: Series): Insight | null {
  if (!nifty || rows.length < 260) return null;
  const r = last(rows);
  const t = nifty.dates.lastIndexOf(r.date);
  if (t < 252 || r.pctAbove200 == null || r.pctAbove50 == null) return null;
  const yr = nifty.closes.slice(t - 251, t + 1);
  const close = nifty.closes[t];
  const fromHigh = pct(Math.max(...yr), close);
  const fromLow = pct(Math.min(...yr), close);
  const pts = rows.filter((x) => x.pctAbove200 != null);
  const series = { dates: pts.map((x) => x.date), values: pts.map((x) => x.pctAbove200 as number), unit: 'pct' as const };

  if (fromHigh >= -3 && r.pctAbove200 <= 55) {
    const facts = [
      `The Nifty 50 closed at ${fmtValue(close, 'index-in')}, ${fmtPct(Math.abs(fromHigh), 1, false)} below its 52-week closing high.`,
      `Only ${r.pctAbove200.toFixed(1)}% of Nifty 500 stocks are above their 200-day average.`,
      'An index near its highs while fewer stocks participate is a classic negative breadth divergence.',
    ];
    return {
      key: 'divergence:negative', category: 'divergence', symbol: 'breadth:divergence',
      score: 70 + (55 - r.pctAbove200) * 0.6,
      facts,
      tweet: `${facts[0]}\n\nYet only ${r.pctAbove200.toFixed(1)}% of Nifty 500 stocks are above their 200-day average.`,
      card: {
        kicker: 'Breadth divergence · Nifty 500',
        headline: `The Nifty is ${fmtPct(Math.abs(fromHigh), 1, false)} from its high, but only ${r.pctAbove200.toFixed(0)}% of stocks are above their 200-day average`,
        subtitle: 'Line: share of Nifty 500 stocks above their 200-day average.',
        keyStat: { value: `${r.pctAbove200.toFixed(0)}%`, label: 'of Nifty 500 stocks above their 200-day average' },
        chart: lineCard(series, 0, { refLines: [{ value: 50, label: '50%' }] }),
        source: `${SOURCE}; Nifty 50 via Yahoo Finance`, asOf: fmtDay(r.date),
      },
    };
  }
  if (fromLow <= 3 && r.pctAbove50 >= 50) {
    const facts = [
      `The Nifty 50 closed at ${fmtValue(close, 'index-in')}, within ${fmtPct(fromLow, 1, false)} of its 52-week closing low.`,
      `Yet ${r.pctAbove50.toFixed(1)}% of Nifty 500 stocks are above their 50-day average.`,
      'Broad participation improving while the index sits near its lows is a positive breadth divergence.',
    ];
    return {
      key: 'divergence:positive', category: 'divergence', symbol: 'breadth:divergence',
      score: 70 + (r.pctAbove50 - 50) * 0.6,
      facts,
      tweet: `${facts[0]}\n\n${facts[1]}`,
      card: {
        kicker: 'Breadth divergence · Nifty 500',
        headline: `The Nifty is near its 52-week low, yet ${r.pctAbove50.toFixed(0)}% of stocks are above their 50-day average`,
        subtitle: 'Line: share of Nifty 500 stocks above their 200-day average.',
        keyStat: { value: `${r.pctAbove50.toFixed(0)}%`, label: 'of Nifty 500 stocks above their 50-day average' },
        chart: lineCard(series, 0, { refLines: [{ value: 50, label: '50%' }] }),
        source: `${SOURCE}; Nifty 50 via Yahoo Finance`, asOf: fmtDay(r.date),
      },
    };
  }
  return null;
}

const SHORT_INDUSTRY: Record<string, string> = {
  'Information Technology': 'IT',
  'Fast Moving Consumer Goods': 'FMCG',
  'Oil Gas & Consumable Fuels': 'Oil & Gas',
  'Automobile and Auto Components': 'Auto',
  'Metals & Mining': 'Metals',
  'Construction Materials': 'Cement',
  'Consumer Durables': 'Consumer Durables',
  'Consumer Services': 'Consumer Services',
  'Financial Services': 'Financials',
  'Telecommunication': 'Telecom',
};
const shortIndustry = (n: string) => SHORT_INDUSTRY[n] ?? (n.length > 20 ? n.slice(0, 19) + '…' : n);

/** Which industries have the healthiest / weakest long-term trends. */
function sectorBreadthInsight(rows: BreadthPoint[], now: Date): Insight | null {
  const r = last(rows);
  const secs = (r.sectors ?? []).filter((s) => s.stocks >= 8).map((s) => ({ ...s, name: shortIndustry(s.name) }));
  if (secs.length < 8) return null;
  const sorted = [...secs].sort((a, b) => b.pctAbove200 - a.pctAbove200).slice(0, 14);
  const top = sorted[0];
  const bottom = last(sorted);
  const weekend = [0, 1, 6].includes(now.getUTCDay());
  return {
    key: 'sector-breadth', category: 'sector-breadth', symbol: 'breadth:sectors',
    score: 50 + Math.min(top.pctAbove200 - bottom.pctAbove200, 60) * 0.25 + (weekend ? 12 : 0),
    facts: [
      `Among Nifty 500 industries, ${top.name} has the most stocks above their 200-day average (${top.pctAbove200.toFixed(0)}%), and ${bottom.name} the fewest (${bottom.pctAbove200.toFixed(0)}%).`,
      `Across all Nifty 500 stocks the figure is ${r.pctAbove200?.toFixed(1)}%.`,
    ],
    tweet: `Share of stocks above their 200-day average, by industry (Nifty 500):\n\n${sorted.slice(0, 3).map((s) => `${s.name} ${s.pctAbove200.toFixed(0)}%`).join('\n')}\n…\n${sorted.slice(-2).map((s) => `${s.name} ${s.pctAbove200.toFixed(0)}%`).join('\n')}`,
    card: {
      kicker: 'Sector breadth · Nifty 500',
      headline: `${top.name} leads with ${top.pctAbove200.toFixed(0)}% of stocks above their 200-day average; ${bottom.name} trails at ${bottom.pctAbove200.toFixed(0)}%`,
      subtitle: `Share of each industry's Nifty 500 stocks above their 200-day average. Overall: ${r.pctAbove200?.toFixed(0)}%.`,
      chart: { kind: 'hbars', items: sorted.map((s) => ({ label: s.name, value: s.pctAbove200 })), format: 'share' },
      source: SOURCE,
      asOf: fmtDay(r.date),
    },
  };
}

export function detectBreadthInsights(rows: BreadthPoint[], nifty: Series | undefined, now: Date): Insight[] {
  if (rows.length < 60) return [];
  const out: Insight[] = [];
  for (const def of METRICS) {
    try {
      const i = metricInsight(def, rows, nifty);
      if (i) out.push(i);
    } catch (e) {
      console.warn(`[market-desk] breadth metric ${def.id} failed:`, e);
    }
  }
  const d = divergenceInsight(rows, nifty);
  if (d) out.push(d);
  const s = sectorBreadthInsight(rows, now);
  if (s) out.push(s);
  return out;
}
