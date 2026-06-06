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

// ---- Stochastics (Lane): %K, %D, %D Slow ----
export type StochRow = {
  date: string; high: number; low: number; close: number;
  lowN: number | null; highN: number | null; k: number | null; d: number | null; dSlow: number | null;
};
export function computeStochastics(bars: Bar[], period: number) {
  const n = bars.length;
  const lowN: (number | null)[] = Array(n).fill(null);
  const highN: (number | null)[] = Array(n).fill(null);
  const k: (number | null)[] = Array(n).fill(null);
  const d: (number | null)[] = Array(n).fill(null);
  const dSlow: (number | null)[] = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i >= period - 1) {
      let mn = Infinity, mx = -Infinity;
      for (let j = i - period + 1; j <= i; j++) { mn = Math.min(mn, bars[j].low); mx = Math.max(mx, bars[j].high); }
      lowN[i] = mn; highN[i] = mx;
      k[i] = mx === mn ? 50 : ((bars[i].close - mn) / (mx - mn)) * 100;
    }
  }
  for (let i = 2; i < n; i++) {
    if (k[i] !== null && k[i - 1] !== null && k[i - 2] !== null)
      d[i] = ((k[i] as number) + (k[i - 1] as number) + (k[i - 2] as number)) / 3;
  }
  for (let i = 2; i < n; i++) {
    if (d[i] !== null && d[i - 1] !== null && d[i - 2] !== null)
      dSlow[i] = ((d[i] as number) + (d[i - 1] as number) + (d[i - 2] as number)) / 3;
  }
  const rows: StochRow[] = bars.map((b, i) => ({ date: b.date, high: b.high, low: b.low, close: b.close, lowN: lowN[i], highN: highN[i], k: k[i], d: d[i], dSlow: dSlow[i] }));
  return { rows, kLine: k as Series, dLine: d as Series };
}

// ---- Accumulation / Distribution Line (Chaikin) ----
export type AdlRow = {
  date: string; high: number; low: number; close: number; volume: number;
  multiplier: number; adjVol: number; adl: number;
};
export function computeAdl(bars: Bar[]) {
  let run = 0;
  const rows: AdlRow[] = bars.map((b) => {
    const mult = b.high === b.low ? 0 : ((b.close - b.low) - (b.high - b.close)) / (b.high - b.low);
    const adj = mult * b.volume;
    run += adj;
    return { date: b.date, high: b.high, low: b.low, close: b.close, volume: b.volume, multiplier: mult, adjVol: adj, adl: run };
  });
  return { rows, line: rows.map((r) => r.adl) as Series };
}

// ---- Money Flow Index (volume-weighted RSI) ----
export type MfiRow = {
  date: string; high: number; low: number; close: number; volume: number;
  typical: number; rawFlow: number; posFlow: number | null; negFlow: number | null; mfi: number | null;
};
export function computeMfi(bars: Bar[], period: number) {
  const n = bars.length;
  const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
  const raw = bars.map((b, i) => tp[i] * b.volume);
  const pos: (number | null)[] = Array(n).fill(null);
  const neg: (number | null)[] = Array(n).fill(null);
  for (let i = 1; i < n; i++) { pos[i] = tp[i] > tp[i - 1] ? raw[i] : 0; neg[i] = tp[i] < tp[i - 1] ? raw[i] : 0; }
  const mfi: (number | null)[] = Array(n).fill(null);
  for (let i = period; i < n; i++) {
    let ps = 0, ns = 0;
    for (let j = i - period + 1; j <= i; j++) { ps += pos[j] as number; ns += neg[j] as number; }
    mfi[i] = ns === 0 ? 100 : 100 - 100 / (1 + ps / ns);
  }
  const rows: MfiRow[] = bars.map((b, i) => ({ date: b.date, high: b.high, low: b.low, close: b.close, volume: b.volume, typical: tp[i], rawFlow: raw[i], posFlow: pos[i], negFlow: neg[i], mfi: mfi[i] }));
  return { rows, line: mfi as Series };
}

// ---- Percentage Price Oscillator (PPO / MACD%) ----
export type PpoRow = { date: string; close: number; emaFast: number; emaSlow: number; ppo: number; signal: number; hist: number };
export function computePpo(bars: Bar[], fast: number, slow: number, signal: number) {
  const closes = bars.map((b) => b.close);
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const ppo = closes.map((_, i) => (es[i] === 0 ? 0 : ((ef[i] - es[i]) / es[i]) * 100));
  const sig = ema(ppo, signal);
  const rows: PpoRow[] = bars.map((b, i) => ({ date: b.date, close: b.close, emaFast: ef[i], emaSlow: es[i], ppo: ppo[i], signal: sig[i], hist: ppo[i] - sig[i] }));
  return { rows, ppoLine: ppo as Series, signalLine: sig as Series };
}

// ---- On Balance Volume (OBV) ----
export type ObvRow = {
  date: string; close: number; volume: number; direction: string; obv: number;
};
export function computeObv(bars: Bar[]) {
  let run = 0;
  const rows: ObvRow[] = bars.map((b, i) => {
    if (i === 0) { run = b.volume; return { date: b.date, close: b.close, volume: b.volume, direction: '—', obv: run }; }
    const prev = bars[i - 1].close;
    let dir = '—';
    if (b.close > prev) { run += b.volume; dir = '+'; }
    else if (b.close < prev) { run -= b.volume; dir = '−'; }
    return { date: b.date, close: b.close, volume: b.volume, direction: dir, obv: run };
  });
  return { rows, line: rows.map((r) => r.obv) as Series };
}

// ---- Directional Movement Index (Wilder): +DI, -DI, ADX ----
export type DmiRow = {
  date: string; high: number; low: number; close: number;
  tr: number; plusDM: number; minusDM: number;
  plusDI: number | null; minusDI: number | null; dx: number | null; adx: number | null;
};
export function computeDmi(bars: Bar[], period: number) {
  const n = bars.length;
  const tr: number[] = Array(n).fill(0);
  const pDM: number[] = Array(n).fill(0);
  const mDM: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i === 0) { tr[i] = bars[i].high - bars[i].low; continue; }
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const up = bars[i].high - bars[i - 1].high;
    const dn = bars[i - 1].low - bars[i].low;
    pDM[i] = up > dn && up > 0 ? up : 0;
    mDM[i] = dn > up && dn > 0 ? dn : 0;
  }
  const tr14: (number | null)[] = Array(n).fill(null);
  const p14: (number | null)[] = Array(n).fill(null);
  const m14: (number | null)[] = Array(n).fill(null);
  const seed = period;
  if (n > seed) {
    let st = 0, sp = 0, sm = 0;
    for (let j = 1; j <= seed; j++) { st += tr[j]; sp += pDM[j]; sm += mDM[j]; }
    tr14[seed] = st; p14[seed] = sp; m14[seed] = sm;
    for (let i = seed + 1; i < n; i++) {
      tr14[i] = (tr14[i - 1] as number) - (tr14[i - 1] as number) / period + tr[i];
      p14[i] = (p14[i - 1] as number) - (p14[i - 1] as number) / period + pDM[i];
      m14[i] = (m14[i - 1] as number) - (m14[i - 1] as number) / period + mDM[i];
    }
  }
  const pDI: (number | null)[] = Array(n).fill(null);
  const mDI: (number | null)[] = Array(n).fill(null);
  const dx: (number | null)[] = Array(n).fill(null);
  const adx: (number | null)[] = Array(n).fill(null);
  for (let i = seed; i < n; i++) {
    const t = tr14[i] as number;
    pDI[i] = t === 0 ? 0 : ((p14[i] as number) / t) * 100;
    mDI[i] = t === 0 ? 0 : ((m14[i] as number) / t) * 100;
    const sum = (pDI[i] as number) + (mDI[i] as number);
    dx[i] = sum === 0 ? 0 : (Math.abs((pDI[i] as number) - (mDI[i] as number)) / sum) * 100;
  }
  const adxSeed = seed + period - 1;
  if (n > adxSeed) {
    let s = 0;
    for (let j = seed; j <= adxSeed; j++) s += dx[j] as number;
    adx[adxSeed] = s / period;
    for (let i = adxSeed + 1; i < n; i++) adx[i] = ((adx[i - 1] as number) * (period - 1) + (dx[i] as number)) / period;
  }
  const rows: DmiRow[] = bars.map((b, i) => ({ date: b.date, high: b.high, low: b.low, close: b.close, tr: tr[i], plusDM: pDM[i], minusDM: mDM[i], plusDI: pDI[i], minusDI: mDI[i], dx: dx[i], adx: adx[i] }));
  return { rows, plusDI: pDI as Series, minusDI: mDI as Series, adx: adx as Series };
}
