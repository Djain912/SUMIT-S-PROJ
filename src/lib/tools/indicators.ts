// Indicator calculations for the interactive teaching tools.
// These mirror the step-by-step Excel examples exactly so students see the same math.
import type { Bar } from './sample-data';

export type Series = (number | null)[];

// ---- Rate of Change (ROC) ----
export type RocRow = { date: string; close: number; roc: number | null };
export function computeRoc(bars: Bar[], period: number) {
  const rows: RocRow[] = bars.map((b, i) => {
    const past = bars[i - period];
    const roc = i >= period && past ? ((b.close - past.close) / past.close) * 100 : null;
    return { date: b.date, close: b.close, roc };
  });
  return { rows, line: rows.map((r) => r.roc) as Series };
}

// ---- Exponential moving average (seed = first value) ----
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => {
    out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k));
  });
  return out;
}

// ---- MACD ----
export type MacdRow = {
  date: string; close: number; emaFast: number; emaSlow: number;
  macd: number; signal: number; hist: number;
};
export function computeMacd(bars: Bar[], fast: number, slow: number, signal: number) {
  const closes = bars.map((b) => b.close);
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const macd = closes.map((_, i) => ef[i] - es[i]);
  const sig = ema(macd, signal);
  const rows: MacdRow[] = bars.map((b, i) => ({
    date: b.date, close: b.close, emaFast: ef[i], emaSlow: es[i],
    macd: macd[i], signal: sig[i], hist: macd[i] - sig[i],
  }));
  return {
    rows,
    macdLine: macd as Series,
    signalLine: sig as Series,
    hist: rows.map((r) => r.hist) as Series,
  };
}

// ---- RSI (Wilder smoothing) ----
export type RsiRow = {
  date: string; close: number; change: number | null; gain: number | null; loss: number | null;
  avgGain: number | null; avgLoss: number | null; rs: number | null; rsi: number | null;
};
export function computeRsi(bars: Bar[], period: number) {
  const n = bars.length;
  const change: (number | null)[] = bars.map((b, i) => (i === 0 ? null : b.close - bars[i - 1].close));
  const gain = change.map((c) => (c === null ? null : Math.max(c, 0)));
  const loss = change.map((c) => (c === null ? null : Math.max(-c, 0)));
  const avgGain: (number | null)[] = Array(n).fill(null);
  const avgLoss: (number | null)[] = Array(n).fill(null);
  const seed = period; // first average sits at index = period (uses changes 1..period)
  if (n > seed) {
    let g = 0, l = 0;
    for (let i = 1; i <= seed; i++) { g += gain[i] as number; l += loss[i] as number; }
    avgGain[seed] = g / period; avgLoss[seed] = l / period;
    for (let i = seed + 1; i < n; i++) {
      avgGain[i] = ((avgGain[i - 1] as number) * (period - 1) + (gain[i] as number)) / period;
      avgLoss[i] = ((avgLoss[i - 1] as number) * (period - 1) + (loss[i] as number)) / period;
    }
  }
  const rows: RsiRow[] = bars.map((b, i) => {
    const ag = avgGain[i], al = avgLoss[i];
    let rs: number | null = null, rsi: number | null = null;
    if (ag !== null && al !== null) {
      rsi = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
      rs = al === 0 ? null : ag / al;
    }
    return { date: b.date, close: b.close, change: change[i], gain: gain[i], loss: loss[i], avgGain: ag, avgLoss: al, rs, rsi };
  });
  return { rows, line: rows.map((r) => r.rsi) as Series };
}
