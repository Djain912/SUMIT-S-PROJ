// Pure helpers for the Market Desk insight engine: returns, streaks,
// "first time since" lookbacks, moving averages, forward-return studies,
// and unit-aware number formatting.

import type { Unit } from './fetch-market-data';

export const pct = (from: number, to: number) => (from === 0 ? 0 : ((to - from) / from) * 100);

export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [NaN];
  for (let i = 1; i < closes.length; i++) out.push(pct(closes[i - 1], closes[i]));
  return out;
}

export function stdev(xs: number[]): number {
  const v = xs.filter(Number.isFinite);
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

export function median(xs: number[]): number {
  const v = [...xs].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function sma(closes: number[], n: number): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= n) sum -= closes[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Current run of consecutive up (+) or down (−) closes ending at the last bar. */
export function currentStreak(closes: number[]): { len: number; dir: 1 | -1; startIdx: number } {
  const n = closes.length;
  if (n < 2) return { len: 0, dir: 1, startIdx: n - 1 };
  const dir: 1 | -1 = closes[n - 1] >= closes[n - 2] ? 1 : -1;
  let len = 0;
  for (let i = n - 1; i >= 1; i--) {
    const d = closes[i] >= closes[i - 1] ? 1 : -1;
    if (d !== dir || closes[i] === closes[i - 1]) break;
    len++;
  }
  return { len, dir, startIdx: n - 1 - len };
}

/** All bar indices where a streak in `dir` first reaches `len` sessions. */
export function streakTriggers(closes: number[], len: number, dir: 1 | -1): number[] {
  const out: number[] = [];
  let run = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] > closes[i - 1] ? 1 : closes[i] < closes[i - 1] ? -1 : 0;
    run = d === dir ? run + 1 : 0;
    if (run === len) out.push(i);
  }
  return out;
}

/** Index of the most recent bar before `before` where predicate holds, or -1. */
export function lastIndexWhere(n: number, before: number, pred: (i: number) => boolean): number {
  for (let i = Math.min(before, n) - 1; i >= 0; i--) if (pred(i)) return i;
  return -1;
}

/**
 * Forward-return study: for each trigger bar, the % change `horizon` bars later.
 * Triggers closer than `minGap` bars to the previous kept one are dropped so a
 * single episode isn't counted many times.
 */
export function forwardStudy(closes: number[], dates: string[], triggers: number[], horizon: number, minGap = 21) {
  const rows: { date: string; ret: number }[] = [];
  let lastKept = -Infinity;
  for (const t of triggers) {
    if (t - lastKept < minGap) continue;
    if (t + horizon >= closes.length) continue; // outcome not known yet
    lastKept = t;
    rows.push({ date: dates[t], ret: pct(closes[t], closes[t + horizon]) });
  }
  const rets = rows.map((r) => r.ret);
  return {
    rows,
    n: rows.length,
    up: rets.filter((r) => r > 0).length,
    median: median(rets),
    avg: rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : NaN,
  };
}

/** Percentile rank (0–100) of the last value within the window. */
export function percentileRank(values: number[], v: number): number {
  const xs = values.filter(Number.isFinite);
  if (!xs.length) return 50;
  return (xs.filter((x) => x <= v).length / xs.length) * 100;
}

/** Index of the last close of the calendar year before `year`, or -1. */
export function lastIdxOfYearBefore(dates: string[], year: number): number {
  return lastIndexWhere(dates.length, dates.length, (i) => Number(dates[i].slice(0, 4)) < year);
}

/** Close `n` sessions ago (clamped). */
export const back = (closes: number[], n: number) => closes[Math.max(0, closes.length - 1 - n)];

// ── Formatting ──────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthName = (m: number) => MONTHS_LONG[m];
export const monthShort = (m: number) => MONTHS[m];

/** 2026-03-14 → "Mar 2026" */
export function fmtMonthYear(d: string): string {
  return `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

/** 2026-03-14 → "14 Mar 2026" */
export function fmtDay(d: string): string {
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

export function fmtPct(n: number, decimals = 1, signed = true): string {
  const s = Math.abs(n).toFixed(decimals);
  if (!signed) return `${s}%`;
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${s}%`;
}

export function fmtValue(v: number, unit: Unit): string {
  switch (unit) {
    case 'index-in':
      return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    case 'index-us':
      return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'usd':
      return '$' + v.toLocaleString('en-US', { maximumFractionDigits: v < 100 ? 2 : 0, minimumFractionDigits: v < 100 ? 2 : 0 });
    case 'inr':
      return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    case 'level':
      return v.toFixed(1);
    case 'yield':
      return v.toFixed(2) + '%';
    case 'ratio':
      return v.toFixed(v < 10 ? 2 : 1);
    case 'pct':
      return v.toFixed(1) + '%';
    case 'count':
      return Math.round(v).toLocaleString('en-IN');
  }
}

/** Compact axis label. `step` (the tick spacing) keeps decimals consistent across an axis. */
export function fmtAxis(v: number, unit: Unit, step?: number): string {
  if (Math.abs(v) < 1e-9) v = 0;
  if (unit === 'pct') return v.toFixed(0) + '%';
  if (unit === 'count') return Math.round(v).toLocaleString('en-IN');
  if (step != null && step < 1000 && unit !== 'yield' && unit !== 'index-in' && unit !== 'index-us') {
    const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    const prefix = unit === 'usd' ? '$' : unit === 'inr' ? '₹' : '';
    return prefix + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  if (unit === 'yield') return v.toFixed(1) + '%';
  if (unit === 'ratio') return v < 10 ? v.toFixed(2) : v.toFixed(0);
  if (unit === 'level') return v < 10 ? v.toFixed(1) : v.toFixed(0);
  const prefix = unit === 'usd' ? '$' : unit === 'inr' ? '₹' : '';
  const a = Math.abs(v);
  if (a >= 100_000) return prefix + (v / 1000).toFixed(0) + 'K';
  if (a >= 10_000) return prefix + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (a >= 1000) return prefix + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return prefix + (a < 10 ? v.toFixed(2) : v.toFixed(0));
}

/** Whole years between two YYYY-MM-DD dates. */
export function yearsBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / (365.25 * 86400_000);
}
