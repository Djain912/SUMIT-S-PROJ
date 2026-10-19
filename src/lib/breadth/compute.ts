// Nifty 500 breadth readings from daily closes: % above 20/50/200-day averages,
// % in a golden cross, 52-week closing highs/lows, advances/declines, the
// advance–decline line and the McClellan Oscillator.
//
// Prices are back-adjusted for splits and bonuses using NSE's adjusted previous
// close: on an ex-date, prevClose ≠ yesterday's close, and the ratio scales all
// earlier closes so moving averages aren't distorted.

export type StockSeries = { dates: string[]; close: number[]; prevClose: number[] };

export type SectorBreadth = { name: string; stocks: number; pctAbove200: number; pctAbove50: number };

export type BreadthRow = {
  date: string;
  stocks: number;
  advances: number;
  declines: number;
  unchanged: number;
  pctAbove20: number | null;
  pctAbove50: number | null;
  pctAbove200: number | null;
  pctGolden: number | null;
  newHighs: number | null;
  newLows: number | null;
  adLine: number;
  ema19: number;
  ema39: number;
  mcclellan: number;
  sectors: SectorBreadth[] | null;
};

export type BreadthSeed = { adLine: number; ema19: number; ema39: number };

const MIN_ELIGIBLE = 100; // below this many stocks a percentage isn't meaningful

function adjusted(s: StockSeries): number[] {
  const n = s.close.length;
  const adj = s.close.slice();
  let cum = 1;
  for (let i = n - 1; i >= 1; i--) {
    const r = s.prevClose[i] / s.close[i - 1];
    if (Number.isFinite(r) && Math.abs(r - 1) > 0.005) cum *= r;
    adj[i - 1] = s.close[i - 1] * cum;
  }
  return adj;
}

export function computeBreadth(
  calendar: string[],
  stocks: Map<string, StockSeries>,
  industries: Map<string, string>,
  fromDate: string,
  seed: BreadthSeed | null,
): BreadthRow[] {
  const C = calendar.length;
  const pos = new Map(calendar.map((d, i) => [d, i]));
  const from = calendar.findIndex((d) => d >= fromDate);
  if (from < 0) return [];

  const z = () => new Array<number>(C).fill(0);
  const acc = {
    n: z(), adv: z(), dec: z(), unch: z(),
    a20: z(), e20: z(), a50: z(), e50: z(), a200: z(), e200: z(),
    gold: z(), eGold: z(), nh: z(), nl: z(), e52: z(),
  };
  const sectorAcc: Map<string, { n: number; a200: number; e200: number; a50: number; e50: number }>[] =
    Array.from({ length: C }, () => new Map());

  for (const [symbol, s] of stocks) {
    const adj = adjusted(s);
    const n = adj.length;
    const prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + adj[i];
    const sma = (i: number, k: number) => (i >= k - 1 ? (prefix[i + 1] - prefix[i + 1 - k]) / k : NaN);
    const industry = industries.get(symbol) ?? 'Other';

    for (let i = 0; i < n; i++) {
      const t = pos.get(s.dates[i]);
      if (t == null || t < from) continue;
      const v = adj[i];
      acc.n[t]++;
      if (s.close[i] > s.prevClose[i]) acc.adv[t]++;
      else if (s.close[i] < s.prevClose[i]) acc.dec[t]++;
      else acc.unch[t]++;

      const m20 = sma(i, 20), m50 = sma(i, 50), m200 = sma(i, 200);
      if (Number.isFinite(m20)) { acc.e20[t]++; if (v > m20) acc.a20[t]++; }
      if (Number.isFinite(m50)) { acc.e50[t]++; if (v > m50) acc.a50[t]++; }
      if (Number.isFinite(m200)) {
        acc.e200[t]++; if (v > m200) acc.a200[t]++;
        acc.eGold[t]++; if (m50 > m200) acc.gold[t]++;
      }
      if (i >= 251) {
        let hi = -Infinity, lo = Infinity;
        for (let j = i - 251; j < i; j++) { if (adj[j] > hi) hi = adj[j]; if (adj[j] < lo) lo = adj[j]; }
        acc.e52[t]++;
        if (v > hi) acc.nh[t]++;
        if (v < lo) acc.nl[t]++;
      }
      const sec = sectorAcc[t].get(industry) ?? { n: 0, a200: 0, e200: 0, a50: 0, e50: 0 };
      sec.n++;
      if (Number.isFinite(m200)) { sec.e200++; if (v > m200) sec.a200++; }
      if (Number.isFinite(m50)) { sec.e50++; if (v > m50) sec.a50++; }
      sectorAcc[t].set(industry, sec);
    }
  }

  const pct = (a: number, e: number) => (e >= MIN_ELIGIBLE ? Math.round((a / e) * 1000) / 10 : null);
  const rows: BreadthRow[] = [];
  let ad = seed?.adLine ?? 0;
  let e19 = seed?.ema19 ?? NaN;
  let e39 = seed?.ema39 ?? NaN;
  for (let t = from; t < C; t++) {
    if (!acc.n[t]) continue;
    const net = acc.adv[t] - acc.dec[t];
    ad += net;
    e19 = Number.isFinite(e19) ? e19 + 0.1 * (net - e19) : net;
    e39 = Number.isFinite(e39) ? e39 + 0.05 * (net - e39) : net;
    const sectors = [...sectorAcc[t]]
      .filter(([, v]) => v.e200 >= 8)
      .map(([name, v]) => ({
        name, stocks: v.n,
        pctAbove200: Math.round((v.a200 / v.e200) * 1000) / 10,
        pctAbove50: v.e50 ? Math.round((v.a50 / v.e50) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.pctAbove200 - a.pctAbove200);
    rows.push({
      date: calendar[t],
      stocks: acc.n[t],
      advances: acc.adv[t],
      declines: acc.dec[t],
      unchanged: acc.unch[t],
      pctAbove20: pct(acc.a20[t], acc.e20[t]),
      pctAbove50: pct(acc.a50[t], acc.e50[t]),
      pctAbove200: pct(acc.a200[t], acc.e200[t]),
      pctGolden: pct(acc.gold[t], acc.eGold[t]),
      newHighs: acc.e52[t] >= MIN_ELIGIBLE ? acc.nh[t] : null,
      newLows: acc.e52[t] >= MIN_ELIGIBLE ? acc.nl[t] : null,
      adLine: ad,
      ema19: e19,
      ema39: e39,
      mcclellan: Math.round((e19 - e39) * 100) / 100,
      sectors: sectors.length ? sectors : null,
    });
  }
  return rows;
}
