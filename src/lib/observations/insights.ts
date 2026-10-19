// Market Desk insight engine. Each detector looks for something genuinely
// notable today and puts it in historical context ("longest since 2023",
// "8 of the last 11 times…"). Every number in a card, headline or tweet is
// computed here — the AI copywriter may only rephrase these facts.

import type { Series, Unit } from './fetch-market-data';
import type { CardSpec, ChartSpec } from './card-svg';
import {
  back, currentStreak, dailyReturns, fmtDay, fmtMonthYear, fmtPct, fmtValue, forwardStudy,
  lastIdxOfYearBefore, lastIndexWhere, median, monthName, pct, percentileRank, sma, stdev,
  streakTriggers, yearsBetween,
} from './stats';

export type Category =
  | 'streak' | 'move' | 'extreme' | 'cross' | 'stretch' | 'drawdown'
  | 'ratio' | 'seasonality' | 'sectors' | 'scoreboard' | 'flows';

export type Insight = {
  key: string;          // novelty key — the same key won't lead again for a few days
  category: Category;
  symbol: string;       // primary asset, used to keep the daily set diverse
  score: number;        // higher = more post-worthy
  card: CardSpec;
  tweet: string;        // deterministic, fact-checked post text (AI may improve it)
  facts: string[];      // the only facts the AI copywriter is allowed to use
};

export type FlowRow = { date: string; fiiNet: number; diiNet: number };

const YAHOO = 'Yahoo Finance';

// Assets whose all-time high is certainly inside our 2010+ window, so a
// window high can be called a record. (Not true for yields, VIX, DXY, Brent.)
const RECORD_SAFE = new Set(['^NSEI', '^NSEBANK', '^NSEMDCP50', '^CNXIT', '^CNXPHARMA', '^GSPC', '^IXIC', 'GC=F', 'BTC-USD', 'USDINR=X']);

// Correlated assets tell the same story on the same day — the daily set
// takes at most one per group for each kind of insight.
export const GROUP: Record<string, string> = {
  '^NSEI': 'india-equity', '^NSEBANK': 'india-equity', '^NSEMDCP50': 'india-equity', '^CNXIT': 'india-equity', '^CNXPHARMA': 'india-equity',
  '^GSPC': 'us-equity', '^IXIC': 'us-equity',
  'GC=F': 'precious', 'SI=F': 'precious',
};

// Equity indices — where "higher a month later" studies make sense.
const EQUITY = new Set(['^NSEI', '^NSEBANK', '^NSEMDCP50', '^CNXIT', '^CNXPHARMA', '^GSPC', '^IXIC']);

const fmtV = (s: Series, v: number) => fmtValue(v, s.unit);
const last = <T,>(a: T[]) => a[a.length - 1];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const sinceYear = (s: Series) => s.dates[0].slice(0, 4);

function lineCard(
  s: { dates: string[]; values: number[]; unit: Unit }, from: number,
  extra: Partial<Extract<ChartSpec, { kind: 'line' }>> = {},
): ChartSpec {
  const f = Math.max(0, from);
  const shift = (i: number) => i - f;
  return {
    kind: 'line',
    dates: s.dates.slice(f),
    values: s.values.slice(f),
    unit: s.unit,
    overlay: extra.overlay ? { ...extra.overlay, values: extra.overlay.values.slice(f) } : undefined,
    refLines: extra.refLines,
    highlight: extra.highlight ? { from: shift(extra.highlight.from), to: shift(extra.highlight.to) } : undefined,
    markers: extra.markers?.map((m) => ({ ...m, idx: shift(m.idx) })).filter((m) => m.idx >= 0),
  };
}

const asLine = (s: Series) => ({ dates: s.dates, values: s.closes, unit: s.unit });

/** Align two series on common dates and combine them. */
function combine(a: Series, b: Series, fn: (x: number, y: number) => number) {
  const m = new Map(b.dates.map((d, i) => [d, b.closes[i]]));
  const dates: string[] = [];
  const values: number[] = [];
  a.dates.forEach((d, i) => {
    const y = m.get(d);
    if (y != null) {
      dates.push(d);
      values.push(fn(a.closes[i], y));
    }
  });
  return { dates, values };
}

// ── 1. Streaks ──────────────────────────────────────────────────────────────

function streakInsight(s: Series): Insight | null {
  if (s.unit === 'yield' || s.symbol === '^VIX' || s.symbol === '^INDIAVIX') return null;
  const { len, dir, startIdx } = currentStreak(s.closes);
  if (len < 5) return null;
  const n = s.closes.length;
  const word = dir > 0 ? 'risen' : 'fallen';
  const kind = dir > 0 ? 'winning' : 'losing';
  const cum = pct(s.closes[startIdx], last(s.closes));

  const prior = streakTriggers(s.closes, len, dir).filter((t) => t < startIdx);
  const lastPrior = last(prior);
  const since = lastPrior != null ? fmtMonthYear(s.dates[lastPrior]) : null;
  const gapYears = lastPrior != null ? yearsBetween(s.dates[lastPrior], last(s.dates)) : 99;

  const study = EQUITY.has(s.symbol) ? forwardStudy(s.closes, s.dates, prior, 21) : null;
  const useStudy = study && study.n >= 6;

  const headline = since
    ? `${s.name} has ${word} for ${len} straight sessions — its longest ${kind} streak since ${since}`
    : `${s.name} has ${word} for ${len} straight sessions — its longest ${kind} streak since at least ${sinceYear(s)}`;
  const facts = [
    `${s.name} has ${word} for ${len} consecutive sessions (${fmtPct(cum)} over the streak, now ${fmtV(s, last(s.closes))}).`,
    since ? `The last ${kind} streak this long was in ${since}.` : `No ${kind} streak this long since at least ${sinceYear(s)}.`,
  ];
  let keyStat: CardSpec['keyStat'];
  if (useStudy) {
    facts.push(`After the previous ${study.n} ${len}-day ${kind} streaks since ${sinceYear(s)}, ${s.name} was higher one month later ${study.up} times (median ${fmtPct(study.median)}).`);
    keyStat = { value: `${study.up} of ${study.n}`, label: `times ${s.short} was higher a month after a ${len}-day ${kind} streak` };
  }
  const tweet = [
    `${s.name} has ${word} for ${len} straight sessions, ${fmtPct(cum)} in total — ${since ? `the longest ${kind} streak since ${since}` : `the longest ${kind} streak since at least ${sinceYear(s)}`}.`,
    useStudy ? `After the previous ${study.n} streaks like this, it was higher a month later ${study.up} times (median ${fmtPct(study.median)}).` : '',
  ].filter(Boolean).join('\n\n');

  return {
    key: `streak:${s.symbol}:${dir}`,
    category: 'streak',
    symbol: s.symbol,
    score: 48 + (len - 4) * 9 + Math.min(gapYears, 5) * 4 + (useStudy ? 10 : 0),
    facts,
    tweet,
    card: {
      kicker: `Streak · ${s.short}`,
      headline,
      subtitle: `${plural(len, 'session')} in a row, ${fmtPct(cum)} in total. Shaded: the current streak.`,
      keyStat,
      chart: lineCard(asLine(s), n - 90, { highlight: { from: startIdx, to: n - 1 } }),
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 2. Outsized one-day moves (vs the asset's own volatility) ───────────────

function moveInsight(s: Series, all: Map<string, Series>): Insight | null {
  if (s.unit === 'yield') return null; // yield moves read in basis points, not %
  if (s.symbol === 'USDINR=X') return null; // Yahoo FX closes carry one-day glitches
  const r = dailyReturns(s.closes);
  const n = r.length;
  const today = r[n - 1];
  const vol = stdev(r.slice(-251, -1));
  if (!vol) return null;
  const z = today / vol;
  const isVix = s.symbol === '^VIX' || s.symbol === '^INDIAVIX';
  if (Math.abs(z) < 2.5 || (isVix && Math.abs(today) < 15) || (!isVix && Math.abs(today) < 1)) return null;

  const up = today > 0;
  const prev = lastIndexWhere(n, n - 1, (i) => (up ? r[i] >= today : r[i] <= today));
  const since = prev > 0 ? fmtDay(s.dates[prev]) : null;
  const gapYears = prev > 0 ? yearsBetween(s.dates[prev], last(s.dates)) : 99;
  const word = up ? 'gain' : 'drop';
  const label = word;

  const headline = since
    ? `${s.name}'s ${fmtPct(today)} day is its biggest one-day ${label} since ${since}`
    : `${s.name}'s ${fmtPct(today)} day is its biggest one-day ${label} since at least ${sinceYear(s)}`;
  const facts = [
    `${s.name} moved ${fmtPct(today)} in one session, closing at ${fmtV(s, last(s.closes))}.`,
    `That is ${Math.abs(z).toFixed(1)} standard deviations of its daily moves over the past year.`,
    since ? `Its biggest one-day ${label} since ${since}.` : `Its biggest one-day ${label} since at least ${sinceYear(s)}.`,
  ];
  let keyStat: CardSpec['keyStat'] = { value: `${Math.abs(z).toFixed(1)}σ`, label: 'move, measured against its own past-year volatility' };
  let studyLine = '';
  let bonus = 0;

  // Fear spikes: what did stocks do next?
  if (isVix && up && today >= 20) {
    const eq = all.get(s.symbol === '^VIX' ? '^GSPC' : '^NSEI');
    if (eq) {
      const pos = new Map(eq.dates.map((d, i) => [d, i]));
      const triggers = s.dates
        .map((d, i) => (r[i] >= 20 ? pos.get(d) : undefined))
        .filter((i): i is number => i != null && i < eq.closes.length - 1);
      const st = forwardStudy(eq.closes, eq.dates, triggers, 21);
      if (st.n >= 6) {
        studyLine = `Since ${sinceYear(s)}, after a 20%+ one-day jump in ${s.name}, the ${eq.name} was higher one month later ${st.up} of ${st.n} times (median ${fmtPct(st.median)}).`;
        facts.push(studyLine);
        keyStat = { value: `${st.up} of ${st.n}`, label: `times the ${eq.short} was higher a month after a 20%+ ${s.short} spike` };
        bonus = 12;
      }
    }
  }

  const tweet = [
    `${s.name} ${up ? 'rose' : 'fell'} ${fmtPct(Math.abs(today), 1, false)} today to ${fmtV(s, last(s.closes))} — a ${Math.abs(z).toFixed(1)}-sigma move and its biggest one-day ${label} since ${since ?? `at least ${sinceYear(s)}`}.`,
    studyLine,
  ].filter(Boolean).join('\n\n');

  return {
    key: `move:${s.symbol}:${up ? 'up' : 'down'}`,
    category: 'move',
    symbol: s.symbol,
    // "Biggest since last week" is a weaker story than "biggest since 2013".
    score: 45 + Math.min(Math.abs(z), 6) * 6 + Math.min(gapYears, 6) * 4 + bonus - (gapYears < 0.25 ? 15 : 0),
    facts,
    tweet,
    card: {
      kicker: `Outsized move · ${s.short}`,
      headline,
      subtitle: `Closed at ${fmtV(s, last(s.closes))}. A ${Math.abs(z).toFixed(1)}σ day relative to the past year's volatility.`,
      keyStat,
      chart: lineCard(asLine(s), n - 130, { markers: [{ idx: n - 1, label: fmtPct(today) }] }),
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 3. Multi-year highs / lows ──────────────────────────────────────────────

function extremeInsight(s: Series): Insight | null {
  const c = s.closes;
  const n = c.length;
  const v = c[n - 1];
  const highIdx = lastIndexWhere(n, n - 1, (i) => c[i] >= v);
  const lowIdx = lastIndexWhere(n, n - 1, (i) => c[i] <= v);
  const asOf = last(s.dates);

  const build = (dir: 'high' | 'low', idx: number): Insight | null => {
    const isRecord = idx < 0;
    const gap = isRecord ? 99 : yearsBetween(s.dates[idx], asOf);
    if (!isRecord && gap < 1) return null;
    // Daily records on a strong trend get repetitive — score a fresh record
    // (first in 60+ sessions) far higher than "another record".
    let prevRecordIdx = -1;
    if (isRecord) {
      let runMax = -Infinity;
      let runMin = Infinity;
      for (let i = 0; i < n - 1; i++) {
        if (c[i] >= runMax) { runMax = c[i]; if (dir === 'high') prevRecordIdx = i; }
        if (c[i] <= runMin) { runMin = c[i]; if (dir === 'low') prevRecordIdx = i; }
      }
    }
    const sessionsSincePrevRecord = prevRecordIdx >= 0 ? n - 1 - prevRecordIdx : 999;

    const recordWord = RECORD_SAFE.has(s.symbol) && dir === 'high' ? 'a record close' : `its ${dir === 'high' ? 'highest' : 'lowest'} close since at least ${sinceYear(s)}`;
    const sinceText = isRecord ? recordWord : `its ${dir === 'high' ? 'highest' : 'lowest'} close since ${fmtMonthYear(s.dates[idx])}`;
    const headline = isRecord && RECORD_SAFE.has(s.symbol) && dir === 'high'
      ? `${s.name} closes at a record ${fmtV(s, v)}`
      : `${s.name} at ${fmtV(s, v)}: ${sinceText}`;
    const y1 = pct(back(c, 252), v);
    const facts = [
      `${s.name} closed at ${fmtV(s, v)}, ${sinceText}.`,
      `It is ${fmtPct(y1)} over the past 12 months.`,
    ];
    const from = isRecord ? n - 756 : Math.max(0, idx - 120);
    const tweet = `${s.name} closed at ${fmtV(s, v)} — ${sinceText}.\n\nIt's ${fmtPct(y1)} over the past 12 months.`;

    let score = isRecord ? (sessionsSincePrevRecord > 60 ? 74 : 50) : 54 + Math.min(gap, 10) * 4;
    if (s.unit === 'level' || s.unit === 'yield') score += 4; // macro gauges travel well
    return {
      key: `extreme:${s.symbol}:${dir}`,
      category: 'extreme',
      symbol: s.symbol,
      score,
      facts,
      tweet,
      card: {
        kicker: `${isRecord && dir === 'high' && RECORD_SAFE.has(s.symbol) ? 'Record' : `Multi-year ${dir}`} · ${s.short}`,
        headline,
        subtitle: isRecord
          ? `${fmtPct(y1)} over the past 12 months.`
          : `The marker shows the last time it closed ${dir === 'high' ? 'this high' : 'this low'}. ${fmtPct(y1)} over 12 months.`,
        keyStat: isRecord ? undefined : { value: fmtMonthYear(s.dates[idx]).split(' ')[1], label: `the last ${dir === 'high' ? 'higher' : 'lower'} close was in ${fmtMonthYear(s.dates[idx])}` },
        chart: lineCard(asLine(s), from, isRecord ? {} : { markers: [{ idx, label: fmtMonthYear(s.dates[idx]) }] }),
        source: YAHOO,
        asOf: fmtDay(asOf),
      },
    };
  };

  // A close can only be a multi-year high or a multi-year low, never both.
  if (highIdx < 0 || yearsBetween(s.dates[highIdx], asOf) >= 1) return build('high', highIdx);
  if (lowIdx < 0 || yearsBetween(s.dates[lowIdx], asOf) >= 1) return build('low', lowIdx);
  return null;
}

// ── 4. Golden / death crosses ───────────────────────────────────────────────

function crossInsight(s: Series): Insight | null {
  if (!EQUITY.has(s.symbol) && !['GC=F', 'SI=F', 'BTC-USD', 'HG=F'].includes(s.symbol)) return null;
  const c = s.closes;
  const n = c.length;
  const a = sma(c, 50);
  const b = sma(c, 200);
  const sign = (i: number) => Math.sign(a[i] - b[i]);
  let crossIdx = -1;
  for (let i = n - 1; i >= n - 2; i--) if (sign(i) !== sign(i - 1) && Number.isFinite(b[i - 1])) crossIdx = i;
  if (crossIdx < 0) return null;
  const golden = sign(crossIdx) > 0;
  const name = golden ? 'golden cross' : 'death cross';

  const crosses: number[] = [];
  for (let i = 201; i < crossIdx; i++) if (sign(i) === sign(crossIdx) && sign(i - 1) !== sign(crossIdx)) crosses.push(i);
  const prevIdx = last(crosses);
  const st = forwardStudy(c, s.dates, crosses, 63, 40);
  const facts = [
    `${s.name}'s 50-day moving average crossed ${golden ? 'above' : 'below'} its 200-day average — a ${name}. Close: ${fmtV(s, last(c))}.`,
    prevIdx != null ? `The previous ${name} was in ${fmtMonthYear(s.dates[prevIdx])}.` : '',
  ].filter(Boolean);
  let keyStat: CardSpec['keyStat'];
  if (st.n >= 6) {
    facts.push(`After the previous ${st.n} ${name}s since ${sinceYear(s)}, ${s.name} was higher three months later ${st.up} times (median ${fmtPct(st.median)}).`);
    keyStat = { value: `${st.up} of ${st.n}`, label: `times ${s.short} was higher 3 months after a ${name}` };
  }
  const tweet = [
    `A ${name} on ${s.name}: the 50-day average just crossed ${golden ? 'above' : 'below'} the 200-day.${prevIdx != null ? ` The last one was in ${fmtMonthYear(s.dates[prevIdx])}.` : ''}`,
    st.n >= 6 ? `Since ${sinceYear(s)}, ${s.name} was higher 3 months after a ${name} ${st.up} of ${st.n} times (median ${fmtPct(st.median)}).` : '',
  ].filter(Boolean).join('\n\n');

  return {
    key: `cross:${s.symbol}:${golden ? 'golden' : 'death'}`,
    category: 'cross',
    symbol: s.symbol,
    score: 66 + (st.n >= 6 ? 10 : 0) + (EQUITY.has(s.symbol) ? 4 : 0),
    facts,
    tweet,
    card: {
      kicker: `${golden ? 'Golden' : 'Death'} cross · ${s.short}`,
      headline: `${s.name} flashes a ${name} as the 50-day average crosses ${golden ? 'above' : 'below'} the 200-day`,
      subtitle: prevIdx != null ? `Previous ${name}: ${fmtMonthYear(s.dates[prevIdx])}. Dotted line: 200-day average.` : 'Dotted line: 200-day average.',
      keyStat,
      chart: lineCard(asLine(s), n - 400, { overlay: { values: b, label: '200-day avg' }, markers: [{ idx: crossIdx, label: golden ? 'Golden cross' : 'Death cross' }] }),
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 5. Stretched vs the 200-day average ─────────────────────────────────────

function stretchInsight(s: Series): Insight | null {
  if (!EQUITY.has(s.symbol) && !['GC=F', 'SI=F', 'BTC-USD'].includes(s.symbol)) return null;
  const c = s.closes;
  const n = c.length;
  const m = sma(c, 200);
  const d = c.map((x, i) => (Number.isFinite(m[i]) ? pct(m[i], x) : NaN));
  const today = d[n - 1];
  const p = percentileRank(d.slice(0, -1), today);
  if (Math.abs(today) < 6 || (p > 4 && p < 96)) return null;
  const below = today < 0;
  // Start of the current episode = last time price was on the other side of the average.
  const episodeStart = lastIndexWhere(n, n - 1, (i) => (below ? d[i] >= 0 : d[i] <= 0));
  const prev = lastIndexWhere(n, Math.max(0, episodeStart), (i) => (below ? d[i] <= today : d[i] >= today));
  const since = prev < 0
    ? `at least ${sinceYear(s)}`
    : prev > 200 && yearsBetween(s.dates[prev], last(s.dates)) >= 1 ? fmtMonthYear(s.dates[prev]) : null;

  const triggers: number[] = [];
  for (let i = 201; i < n - 1; i++) if ((below ? d[i] <= today : d[i] >= today) && !(below ? d[i - 1] <= today : d[i - 1] >= today)) triggers.push(i);
  const st = forwardStudy(c, s.dates, triggers, 63, 40);

  const facts = [
    `${s.name} is ${fmtPct(Math.abs(today), 1, false)} ${below ? 'below' : 'above'} its 200-day moving average.`,
    since ? `That is the widest gap ${below ? 'below' : 'above'} the average since ${since}.` : `Readings this stretched occur less than ${below ? Math.max(1, Math.round(p)) : Math.max(1, Math.round(100 - p))}% of the time since ${sinceYear(s)}.`,
  ];
  let keyStat: CardSpec['keyStat'] = { value: fmtPct(today), label: 'distance from the 200-day moving average' };
  if (st.n >= 6) {
    facts.push(`When ${s.name} was this far ${below ? 'below' : 'above'} its 200-day average before (${st.n} episodes since ${sinceYear(s)}), it was higher three months later ${st.up} times (median ${fmtPct(st.median)}).`);
    keyStat = { value: `${st.up} of ${st.n}`, label: `times ${s.short} was higher 3 months after a stretch like this` };
  }
  const tweet = [
    `${s.name} is now ${fmtPct(Math.abs(today), 1, false)} ${below ? 'below' : 'above'} its 200-day average${since ? ` — the most stretched since ${since}` : ''}.`,
    st.n >= 6 ? `In the ${st.n} previous episodes since ${sinceYear(s)}, it was higher 3 months later ${st.up} times (median ${fmtPct(st.median)}).` : '',
  ].filter(Boolean).join('\n\n');

  return {
    key: `stretch:${s.symbol}:${below ? 'below' : 'above'}`,
    category: 'stretch',
    symbol: s.symbol,
    score: 58 + Math.min(Math.abs(today), 20) + (st.n >= 6 ? 8 : 0),
    facts,
    tweet,
    card: {
      kicker: `Stretched · ${s.short}`,
      headline: since
        ? `${s.name} is ${fmtPct(Math.abs(today), 1, false)} ${below ? 'below' : 'above'} its 200-day average — the widest gap since ${since}`
        : `${s.name} is ${fmtPct(Math.abs(today), 1, false)} ${below ? 'below' : 'above'} its 200-day average`,
      subtitle: `Dotted line: 200-day moving average. Close ${fmtV(s, last(c))}.`,
      keyStat,
      chart: lineCard(asLine(s), n - 500, { overlay: { values: m, label: '200-day avg' } }),
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 6. Drawdown from the peak ───────────────────────────────────────────────

function drawdownInsight(s: Series): Insight | null {
  if (!EQUITY.has(s.symbol) && !['GC=F', 'BTC-USD', 'SI=F'].includes(s.symbol)) return null;
  const c = s.closes;
  const n = c.length;
  let peakIdx = 0;
  for (let i = 1; i < n; i++) if (c[i] >= c[peakIdx]) peakIdx = i;
  const dd = pct(c[peakIdx], c[n - 1]);
  const sessions = n - 1 - peakIdx;
  if (dd > -10 && sessions < 250) return null;
  const peakWord = RECORD_SAFE.has(s.symbol) ? 'record close' : 'peak';
  const facts = [
    `${s.name} closed at ${fmtV(s, c[n - 1])}, ${fmtPct(Math.abs(dd), 1, false)} below its ${peakWord} of ${fmtV(s, c[peakIdx])} on ${fmtDay(s.dates[peakIdx])}.`,
    `${sessions} trading sessions have passed without a new ${peakWord === 'peak' ? 'peak' : 'record'}.`,
  ];
  return {
    key: `drawdown:${s.symbol}`,
    category: 'drawdown',
    symbol: s.symbol,
    score: 34 + Math.min(Math.abs(dd), 40) * 0.5 + Math.min(sessions / 60, 6),
    facts,
    tweet: `${s.name} is ${fmtPct(Math.abs(dd), 1, false)} below its ${peakWord} of ${fmtV(s, c[peakIdx])}, set on ${fmtDay(s.dates[peakIdx])}.\n\nThat's ${sessions} trading sessions without a new high.`,
    card: {
      kicker: `Drawdown · ${s.short}`,
      headline: `${s.name} is still ${fmtPct(Math.abs(dd), 1, false)} below its ${peakWord} from ${fmtMonthYear(s.dates[peakIdx])}`,
      subtitle: `${peakWord[0].toUpperCase() + peakWord.slice(1)} of ${fmtV(s, c[peakIdx])} on ${fmtDay(s.dates[peakIdx])}; ${sessions} sessions without a new high.`,
      keyStat: { value: fmtPct(dd), label: `from the ${peakWord} (${fmtMonthYear(s.dates[peakIdx])})` },
      chart: lineCard(asLine(s), Math.min(peakIdx - 250, n - 500), { markers: [{ idx: peakIdx, label: `${peakWord === 'peak' ? 'Peak' : 'Record'} ${fmtMonthYear(s.dates[peakIdx])}` }] }),
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 7. Ratios ───────────────────────────────────────────────────────────────

type RatioDef = {
  id: string;
  a: string;
  b: string;
  name: string;
  fn: (x: number, y: number) => number;
  explain: string;
  unitWord?: string;
};

const RATIOS: RatioDef[] = [
  { id: 'gold-silver', a: 'GC=F', b: 'SI=F', name: 'Gold/silver ratio', fn: (x, y) => x / y, explain: 'Ounces of silver needed to buy one ounce of gold.' },
  { id: 'copper-gold', a: 'HG=F', b: 'GC=F', name: 'Copper/gold ratio', fn: (x, y) => (x / y) * 1000, explain: 'Copper tracks growth, gold tracks fear — a long-running gauge of risk appetite.' },
  { id: 'bank-nifty', a: '^NSEBANK', b: '^NSEI', name: 'Bank Nifty vs Nifty 50', fn: (x, y) => x / y, explain: 'Rising line: banks are outperforming the broad market.' },
  { id: 'midcap-nifty', a: '^NSEMDCP50', b: '^NSEI', name: 'Midcaps vs Nifty 50', fn: (x, y) => x / y, explain: 'Rising line: midcaps are outperforming large caps.' },
  { id: 'it-nifty', a: '^CNXIT', b: '^NSEI', name: 'Nifty IT vs Nifty 50', fn: (x, y) => x / y, explain: 'Rising line: IT is outperforming the broad market.' },
];

function ratioInsight(def: RatioDef, all: Map<string, Series>): Insight | null {
  const a = all.get(def.a);
  const b = all.get(def.b);
  if (!a || !b) return null;
  const { dates, values } = combine(a, b, def.fn);
  const n = values.length;
  if (n < 600) return null;
  const v = values[n - 1];
  const tenY = values.slice(-2520);
  const avg = tenY.reduce((x, y) => x + y, 0) / tenY.length;
  const p = percentileRank(tenY.slice(0, -1), v);
  const hi = lastIndexWhere(n, n - 1, (i) => values[i] >= v);
  const lo = lastIndexWhere(n, n - 1, (i) => values[i] <= v);
  const asOf = last(dates);
  const highSide = p >= 50;
  const idx = highSide ? hi : lo;
  const gap = idx < 0 ? 99 : yearsBetween(dates[idx], asOf);
  const chg3m = pct(values[Math.max(0, n - 64)], v);
  const isRel = def.id.endsWith('nifty');

  const extremeText = idx < 0
    ? `the ${highSide ? 'highest' : 'lowest'} since at least ${dates[0].slice(0, 4)}`
    : gap >= 1 ? `the ${highSide ? 'highest' : 'lowest'} since ${fmtMonthYear(dates[idx])}` : null;

  const valueText = isRel ? '' : ` at ${v.toFixed(v < 10 ? 2 : 1)}`;
  const headline = isRel
    ? extremeText
      ? `${def.name}: relative strength at ${extremeText}`
      : `${def.name}: ${fmtPct(chg3m)} relative performance in three months`
    : extremeText
      ? `The ${def.name.toLowerCase()} is${valueText}, ${extremeText}`
      : `The ${def.name.toLowerCase()} is${valueText}, ${v > avg ? 'above' : 'below'} its 10-year average of ${avg.toFixed(avg < 10 ? 2 : 1)}`;

  const facts = [
    isRel
      ? `The ${def.name} ratio changed ${fmtPct(chg3m)} over three months${extremeText ? ` and is at ${extremeText}` : ''}.`
      : `The ${def.name.toLowerCase()} is ${v.toFixed(v < 10 ? 2 : 1)}${extremeText ? `, ${extremeText}` : ''}. Its 10-year average is ${avg.toFixed(avg < 10 ? 2 : 1)}.`,
    `${def.explain}`,
    `Over the past 10 years, the ratio has been ${highSide ? 'higher' : 'lower'} than today only ${Math.max(1, Math.round(highSide ? 100 - p : p))}% of the time.`,
  ];
  const tweet = isRel
    ? `${def.name}: ${fmtPct(chg3m)} relative performance over three months${extremeText ? ` — relative strength at ${extremeText}` : ''}.\n\n${def.explain}`
    : `The ${def.name.toLowerCase()} is ${v.toFixed(v < 10 ? 2 : 1)}${extremeText ? `, ${extremeText}` : ''} (10-year average: ${avg.toFixed(avg < 10 ? 2 : 1)}).\n\n${def.explain}`;

  const extremeness = Math.abs(p - 50) * 2; // 0–100
  let score = 34 + extremeness * 0.25 + (extremeText ? Math.min(gap, 10) * 3.5 : 0) + Math.min(Math.abs(chg3m), 15) * 0.6;
  if (!extremeText) score = Math.min(score, 44);
  return {
    key: `ratio:${def.id}`,
    category: 'ratio',
    symbol: `ratio:${def.id}`,
    score,
    facts,
    tweet,
    card: {
      kicker: `Ratio · ${def.name}`,
      headline,
      subtitle: def.explain,
      keyStat: extremeText && idx >= 0
        ? { value: dates[idx].slice(0, 4), label: `last time the ratio was this ${highSide ? 'high' : 'low'}` }
        : { value: `${Math.max(1, Math.round(highSide ? 100 - p : p))}%`, label: `of the past 10 years it was ${highSide ? 'higher' : 'lower'} than today` },
      chart: lineCard({ dates, values, unit: 'ratio' }, n - 2520, {
        refLines: [{ value: avg, label: `10-year average ${avg.toFixed(avg < 10 ? 2 : 1)}` }],
        markers: extremeText && idx >= 0 && n - 1 - idx < 2520 ? [{ idx, label: fmtMonthYear(dates[idx]) }] : undefined,
      }),
      source: YAHOO,
      asOf: fmtDay(asOf),
    },
  };
}

// ── 8. Seasonality (around the turn of the month) ───────────────────────────

function seasonalityInsight(s: Series, now: Date): Insight | null {
  const day = now.getUTCDate();
  let month: number; // 0-based target month
  let year = now.getUTCFullYear();
  if (day >= 25) {
    month = (now.getUTCMonth() + 1) % 12;
    if (month === 0) year += 1;
  } else if (day <= 3) {
    month = now.getUTCMonth();
  } else return null;

  const rows: { label: string; value: number; y: number }[] = [];
  const firstYear = Number(s.dates[0].slice(0, 4)) + 1;
  for (let y = firstYear; y < year; y++) {
    const start = `${y}-${String(month + 1).padStart(2, '0')}-01`;
    const endY = month === 11 ? y + 1 : y;
    const end = `${endY}-${String(((month + 1) % 12) + 1).padStart(2, '0')}-01`;
    const a = lastIndexWhere(s.dates.length, s.dates.length, (i) => s.dates[i] < start);
    const b = lastIndexWhere(s.dates.length, s.dates.length, (i) => s.dates[i] < end);
    if (a < 0 || b <= a || s.dates[b] < start) continue;
    rows.push({ label: `'${String(y).slice(2)}`, value: pct(s.closes[a], s.closes[b]), y });
  }
  if (rows.length < 10) return null;
  const vals = rows.map((r) => r.value);
  const up = vals.filter((v) => v > 0).length;
  const med = median(vals);
  const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
  const best = rows.reduce((x, y) => (y.value > x.value ? y : x));
  const worst = rows.reduce((x, y) => (y.value < x.value ? y : x));
  const mName = monthName(month);
  const facts = [
    `In the last ${rows.length} years (${rows[0].y}–${last(rows).y}), ${s.name} rose in ${mName} ${up} times and fell ${rows.length - up} times.`,
    `Median ${mName} return: ${fmtPct(med)}; average ${fmtPct(avg)}.`,
    `Best: ${fmtPct(best.value)} in ${best.y}. Worst: ${fmtPct(worst.value)} in ${worst.y}.`,
  ];
  const strength = Math.abs(up / rows.length - 0.5) * 2; // 0 = coin flip, 1 = one-sided
  return {
    key: `season:${s.symbol}:${month}`,
    category: 'seasonality',
    symbol: s.symbol,
    score: 50 + strength * 30 + Math.min(Math.abs(med), 4) * 2,
    facts,
    tweet: `How ${s.name} has done in ${mName}, ${rows[0].y}–${last(rows).y}:\n\nUp ${up} of ${rows.length} years\nMedian ${fmtPct(med)}, average ${fmtPct(avg)}\nBest ${fmtPct(best.value)} (${best.y}), worst ${fmtPct(worst.value)} (${worst.y})`,
    card: {
      kicker: `Seasonality · ${s.short}`,
      headline: `${s.name} in ${mName}: higher in ${up} of the last ${rows.length} years`,
      subtitle: `${mName} returns by year. Median ${fmtPct(med)}, average ${fmtPct(avg)}.`,
      keyStat: { value: `${up} of ${rows.length}`, label: `${mName}s that ended higher` },
      chart: { kind: 'bars', items: rows.map(({ label, value }) => ({ label, value })), format: 'pct', avg: { value: med, label: `Median ${fmtPct(med)}` } },
      source: YAHOO,
      asOf: fmtDay(last(s.dates)),
    },
  };
}

// ── 9. Sector scoreboard ────────────────────────────────────────────────────

function sectorInsight(sectors: Series[], now: Date): Insight | null {
  if (sectors.length < 6) return null;
  const rows = sectors
    .map((s) => ({ label: s.short, m1: pct(back(s.closes, 21), last(s.closes)), w1: pct(back(s.closes, 5), last(s.closes)) }))
    .sort((a, b) => b.m1 - a.m1);
  const top = rows[0];
  const bottom = last(rows);
  const spread = top.m1 - bottom.m1;
  const weekend = [0, 1, 6].includes(now.getUTCDay());
  const asOf = sectors.map((s) => last(s.dates)).sort().pop()!;
  const facts = [
    `Over the past month, ${top.label} was the best-performing Indian sector (${fmtPct(top.m1)}) and ${bottom.label} the weakest (${fmtPct(bottom.m1)}), based on NSE sector ETFs.`,
    `Spread between the best and worst sector: ${spread.toFixed(1)} percentage points.`,
    `Past week: ${rows.slice().sort((a, b) => b.w1 - a.w1).slice(0, 3).map((r) => `${r.label} ${fmtPct(r.w1)}`).join(', ')} led.`,
  ];
  return {
    key: 'sectors:india',
    category: 'sectors',
    symbol: 'sectors',
    score: 46 + Math.min(spread, 20) + (weekend ? 14 : 0),
    facts,
    tweet: `Indian sectors, past month:\n\n${rows.slice(0, 3).map((r) => `${r.label} ${fmtPct(r.m1)}`).join('\n')}\n…\n${rows.slice(-2).map((r) => `${r.label} ${fmtPct(r.m1)}`).join('\n')}\n\nA ${spread.toFixed(1)}-point gap between leader and laggard.`,
    card: {
      kicker: 'Sector scoreboard · India',
      headline: `${top.label} leads Indian sectors over the past month; ${bottom.label} lags`,
      subtitle: `One-month total price return of NSE sector ETFs. Spread: ${spread.toFixed(1)} percentage points.`,
      chart: { kind: 'hbars', items: rows.map((r) => ({ label: r.label, value: r.m1 })), format: 'pct' },
      source: 'NSE sector ETFs via Yahoo Finance',
      asOf: fmtDay(asOf),
    },
  };
}

// ── 10. Cross-asset scoreboard, in rupees ───────────────────────────────────

function scoreboardInsight(all: Map<string, Series>, now: Date): Insight | null {
  const inr = all.get('USDINR=X');
  const nifty = all.get('^NSEI');
  if (!inr || !nifty) return null;
  const year = Number(last(nifty.dates).slice(0, 4));
  const ytdSessions = nifty.dates.length - 1 - lastIdxOfYearBefore(nifty.dates, year);
  const useYtd = ytdSessions >= 40;

  const perf = (dates: string[], values: number[]) => {
    const base = useYtd ? lastIdxOfYearBefore(dates, year) : Math.max(0, values.length - 253);
    return base < 0 ? NaN : pct(values[base], last(values));
  };
  const inRupees = (sym: string) => {
    const s = all.get(sym);
    return s ? combine(s, inr, (x, y) => x * y) : null;
  };
  const items: { label: string; value: number }[] = [];
  const add = (label: string, d: { dates: string[]; values: number[] } | null) => {
    if (!d) return;
    const v = perf(d.dates, d.values);
    if (Number.isFinite(v)) items.push({ label, value: v });
  };
  add('Nifty 50', asLine(nifty));
  const mid = all.get('^NSEMDCP50');
  if (mid) add('Midcap 50', asLine(mid));
  add('Gold', inRupees('GC=F'));
  add('Silver', inRupees('SI=F'));
  add('S&P 500', inRupees('^GSPC'));
  add('Nasdaq', inRupees('^IXIC'));
  add('Bitcoin', inRupees('BTC-USD'));
  add('US dollar', asLine(inr));
  if (items.length < 5) return null;
  items.sort((a, b) => b.value - a.value);
  const period = useYtd ? `${year} so far` : 'the past 12 months';
  const top = items[0];
  const bottom = last(items);
  const friday = [5, 6].includes(now.getUTCDay());
  const facts = [
    `Returns in Indian rupees over ${period}: ${items.map((i) => `${i.label} ${fmtPct(i.value)}`).join(', ')}.`,
    `Foreign assets include the rupee's move against the dollar.`,
  ];
  return {
    key: 'scoreboard:inr',
    category: 'scoreboard',
    symbol: 'scoreboard',
    score: 48 + (friday ? 12 : 0) + Math.min(Math.abs(top.value - bottom.value) / 4, 10),
    facts,
    tweet: `${period[0].toUpperCase() + period.slice(1)}, in rupees:\n\n${items.map((i) => `${i.label} ${fmtPct(i.value)}`).join('\n')}`,
    card: {
      kicker: `Asset scoreboard · in rupees`,
      headline: `${top.label} ${fmtPct(top.value)}, ${bottom.label} ${fmtPct(bottom.value)}: how assets have done for Indian investors in ${period}`,
      subtitle: `Price returns in ₹, so foreign assets include the rupee's move against the dollar.`,
      chart: { kind: 'hbars', items, format: 'pct' },
      source: YAHOO,
      asOf: fmtDay(last(nifty.dates)),
    },
  };
}

// ── 11. FII / DII flows ─────────────────────────────────────────────────────

function flowsInsight(rows: FlowRow[]): Insight | null {
  if (rows.length < 10) return null;
  const n = rows.length;
  const dir = Math.sign(rows[n - 1].fiiNet) || -1;
  let len = 0;
  while (len < n && Math.sign(rows[n - 1 - len].fiiNet) === dir) len++;
  const streak = rows.slice(n - len);
  const fiiSum = streak.reduce((a, r) => a + r.fiiNet, 0);
  const diiSum = streak.reduce((a, r) => a + r.diiNet, 0);

  // Longest same-direction streak earlier in our data
  let longestPrev = 0;
  let longestPrevEnd = '';
  let run = 0;
  for (let i = 0; i < n - len; i++) {
    run = Math.sign(rows[i].fiiNet) === dir ? run + 1 : 0;
    if (run >= longestPrev) {
      longestPrev = run;
      longestPrevEnd = rows[i].date;
    }
  }
  const month = rows[n - 1].date.slice(0, 7);
  const mtd = rows.filter((r) => r.date.startsWith(month));
  const fiiMtd = mtd.reduce((a, r) => a + r.fiiNet, 0);
  const diiMtd = mtd.reduce((a, r) => a + r.diiNet, 0);
  const crore = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')} crore`;
  const signed = (v: number) => `${v >= 0 ? '+' : '−'}${crore(v)}`;
  const last20 = rows.slice(-20);
  const asOf = fmtDay(rows[n - 1].date);
  const bars: ChartSpec = { kind: 'bars', items: last20.map((r) => ({ label: `${Number(r.date.slice(8, 10))}/${Number(r.date.slice(5, 7))}`, value: r.fiiNet })), format: 'crore' };

  if (len < 4) {
    // No streak worth a post — tell the month-to-date story if it is large.
    if (Math.abs(fiiMtd) < 15000 || mtd.length < 5) return null;
    const monthWord = monthName(Number(month.slice(5, 7)) - 1);
    const fiiWord = fiiMtd < 0 ? 'sold' : 'bought';
    return {
      key: `flows:mtd:${fiiMtd < 0 ? 'sell' : 'buy'}`,
      category: 'flows',
      symbol: 'flows',
      score: 50 + Math.min(Math.abs(fiiMtd) / 4000, 14),
      facts: [
        `In ${monthWord} so far (${mtd.length} sessions), FIIs have net ${fiiWord} ${crore(fiiMtd)} of Indian cash equities.`,
        `DIIs have net ${diiMtd >= 0 ? 'bought' : 'sold'} ${crore(diiMtd)} over the same sessions.`,
      ],
      tweet: `${monthWord} so far, Indian cash market (${mtd.length} sessions):\n\nFIIs ${signed(fiiMtd)}\nDIIs ${signed(diiMtd)}`,
      card: {
        kicker: 'Institutional flows · India',
        headline: `FIIs have net ${fiiWord} ${crore(fiiMtd)} in ${monthWord}; DIIs ${diiMtd >= 0 ? 'bought' : 'sold'} ${crore(diiMtd)}`,
        subtitle: `Daily FII net cash-market flows, last ${last20.length} sessions.`,
        keyStat: { value: `${fiiMtd < 0 ? '−' : '+'}₹${(Math.abs(fiiMtd) / 1000).toFixed(1)}K cr`, label: `FII net flow in ${monthWord} so far` },
        chart: bars,
        source: 'NSE provisional data',
        asOf,
      },
    };
  }

  const verb = dir < 0 ? 'net sellers' : 'net buyers';
  const record = len > longestPrev;
  const facts = [
    `Foreign institutional investors (FIIs) have been ${verb} in Indian cash equities for ${len} straight sessions, ${dir < 0 ? 'selling' : 'buying'} a net ${crore(fiiSum)}.`,
    `Domestic institutions (DIIs) were net ${diiSum >= 0 ? 'buyers' : 'sellers'} of ${crore(diiSum)} over the same sessions.`,
    `Month to date: FIIs ${signed(fiiMtd)}, DIIs ${signed(diiMtd)}.`,
    record ? `This is the longest such streak since our records begin in ${fmtMonthYear(rows[0].date)}.` : longestPrev ? `The longest such streak in our records was ${longestPrev} sessions (ending ${fmtDay(longestPrevEnd)}).` : '',
  ].filter(Boolean);
  return {
    key: `flows:fii:${dir < 0 ? 'sell' : 'buy'}`,
    category: 'flows',
    symbol: 'flows',
    score: 52 + Math.min(len, 12) * 3 + (record ? 10 : 0) + Math.min(Math.abs(fiiMtd) / 5000, 8),
    facts,
    tweet: `FIIs have been ${verb} for ${len} straight sessions: ${signed(fiiSum)}.\n\nDIIs ${diiSum >= 0 ? 'bought' : 'also sold'} ${crore(diiSum)} over the same stretch.\n\nMonth to date: FIIs ${signed(fiiMtd)}, DIIs ${signed(diiMtd)}.`,
    card: {
      kicker: 'Institutional flows · India',
      headline: `FIIs have been ${verb} for ${len} straight sessions${record ? ', the longest run in our records' : ''}`,
      subtitle: `Daily FII net cash-market flows, last ${last20.length} sessions. DIIs: ${signed(diiSum)} over the streak.`,
      keyStat: { value: `${dir < 0 ? '−' : '+'}₹${(Math.abs(fiiSum) / 1000).toFixed(1)}K cr`, label: `FII net ${dir < 0 ? 'selling' : 'buying'} over the ${len}-session streak` },
      chart: bars,
      source: 'NSE provisional data',
      asOf,
    },
  };
}

// ── entry point ─────────────────────────────────────────────────────────────

export function detectInsights(core: Series[], sectors: Series[], flows: FlowRow[], now = new Date()): Insight[] {
  const all = new Map(core.map((s) => [s.symbol, s]));
  const out: Insight[] = [];
  const push = (i: Insight | null) => { if (i) out.push(i); };

  for (const s of core) {
    try {
      push(streakInsight(s));
      push(moveInsight(s, all));
      push(extremeInsight(s));
      push(crossInsight(s));
      push(stretchInsight(s));
      push(drawdownInsight(s));
    } catch (e) {
      console.warn(`[market-desk] detector failed for ${s.symbol}:`, e);
    }
  }
  for (const r of RATIOS) push(ratioInsight(r, all));
  for (const sym of ['^NSEI', 'GC=F', '^GSPC']) {
    const s = all.get(sym);
    if (s) push(seasonalityInsight(s, now));
  }
  push(sectorInsight(sectors, now));
  push(scoreboardInsight(all, now));
  push(flowsInsight(flows));

  // Indian audience first: small nudge for India-focused posts.
  for (const i of out) {
    const s = all.get(i.symbol);
    if ((s && s.region === 'india') || ['flows', 'sectors', 'scoreboard'].includes(i.category) || i.symbol.includes('nifty')) i.score += 5;
  }
  return out.sort((a, b) => b.score - a.score);
}
