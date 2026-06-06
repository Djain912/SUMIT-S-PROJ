'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import { computeRoc, computeMacd, computeRsi, computeStochastics, computeAdl, computeMfi, computePpo, computeDmi, computeObv, computeCmf, computeRvol } from '@/lib/tools/indicators';
import { PanelChart } from '@/components/tools/panel-chart';

export type IndicatorKey = 'roc' | 'macd' | 'rsi' | 'stochastics' | 'adl' | 'mfi' | 'ppo' | 'dmi' | 'obv' | 'cmf' | 'rvol';

const EMERALD = '#047857';
const BLUE = '#2563eb';
const AMBER = '#d97706';
const RED = '#dc2626';
const PURPLE = '#7c3aed';

type Meta = {
  name: string; blurb: string; formula: string;
  measures: string; construction: string[]; reading: string[];
};
const META: Record<IndicatorKey, Meta> = {
  roc: {
    name: 'Rate of Change (ROC)',
    blurb: 'ROC shows how much price has changed, in percent, compared with a set number of bars ago.',
    formula: 'ROC = ((Close today − Close n bars ago) ÷ Close n bars ago) × 100',
    measures: 'ROC measures momentum — the percentage change in price over a chosen lookback period.',
    construction: [
      'Choose a lookback period n (the slider above).',
      'Take today\'s close and the close n bars ago.',
      'Subtract them, divide by the old close, and multiply by 100 to get a %.',
      'Plot that value as a line and repeat for every bar.',
    ],
    reading: [
      'Crossing above the 0 line = price is now higher than it was n bars ago (upward momentum).',
      'A rising ROC = momentum accelerating; a falling ROC = momentum slowing.',
      'It is unbounded, but the value is meaningful — it is the actual % change.',
    ],
  },
  macd: {
    name: 'MACD',
    blurb: 'MACD measures momentum as the gap between a fast and a slow moving average of price.',
    formula: 'MACD = Fast EMA − Slow EMA   ·   Signal = EMA of MACD   ·   Histogram = MACD − Signal',
    measures: 'MACD measures momentum as the distance between a fast EMA and a slow EMA of the close.',
    construction: [
      'Compute a fast EMA and a slow EMA of the closing price.',
      'MACD line = fast EMA − slow EMA.',
      'Signal line = an EMA of the MACD line.',
      'Histogram = MACD line − Signal line.',
    ],
    reading: [
      'MACD above 0 = the fast EMA is above the slow EMA (uptrend bias).',
      'MACD crossing above its Signal line = momentum turning up (histogram flips positive).',
      'A widening histogram = accelerating momentum; a shrinking one = decelerating.',
    ],
  },
  rsi: {
    name: 'Relative Strength Index (RSI)',
    blurb: 'RSI compares average gains to average losses to show momentum on a fixed 0–100 scale.',
    formula: 'RS = Average Gain ÷ Average Loss   ·   RSI = 100 − (100 ÷ (1 + RS))',
    measures: 'RSI measures momentum by comparing the average size of up moves to down moves, on a 0–100 scale.',
    construction: [
      'For each bar, record the gain (if price rose) or the loss (if it fell).',
      'Average the gains and the losses over the period using Wilder smoothing.',
      'RS = average gain ÷ average loss.',
      'RSI = 100 − 100 ÷ (1 + RS).',
    ],
    reading: [
      '70 and above = overbought (relatively high); 30 and below = oversold (relatively low).',
      '50 is the midline — above 50 gains dominate, below 50 losses dominate.',
      'These are conditions, not automatic buy or sell signals.',
    ],
  },
  stochastics: {
    name: 'Stochastics (Fast %K / %D)',
    blurb: 'Stochastics shows where the close sits within the recent high-to-low range.',
    formula: '%K = (Close − Lowest Low n) ÷ (Highest High n − Lowest Low n) × 100   ·   %D = 3-bar average of %K',
    measures: 'Stochastics measures momentum by the position of the close within the high-low range over the lookback.',
    construction: [
      'Find the lowest low and highest high over the last n bars.',
      '%K = (Close − lowest low) ÷ (highest high − lowest low) × 100.',
      '%D = the 3-bar average of %K (the signal line).',
      '%D Slow = the 3-bar average of %D (used by the slow stochastic).',
    ],
    reading: [
      'Above 80 = overbought; below 20 = oversold (relatively high / low).',
      '%K crossing %D can flag a momentum shift.',
      'Bounded 0–100; it uses the high and low, not just the close.',
    ],
  },
  adl: {
    name: 'Accumulation / Distribution Line (ADL)',
    blurb: 'A running volume total that adds more on strong closes and subtracts on weak closes.',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   ADL = previous ADL + Multiplier × Volume',
    measures: 'ADL gauges buying vs selling pressure by weighting each day\'s volume by where the close finished in its range.',
    construction: [
      'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low), a value between −1 and +1.',
      'Adjusted Volume = Multiplier × Volume.',
      'ADL = previous ADL + Adjusted Volume (a cumulative running total).',
    ],
    reading: [
      'Rising ADL = accumulation (buying); falling ADL = distribution (selling).',
      'It is an unbounded index — watch its trend, not the raw value.',
      'Price up but ADL down (or vice-versa) is a divergence worth noting.',
    ],
  },
  mfi: {
    name: 'Money Flow Index (MFI)',
    blurb: 'A volume-weighted RSI on a fixed 0–100 scale.',
    formula: 'Typical Price = (H+L+C) ÷ 3   ·   MFI = 100 − 100 ÷ (1 + Positive Flow ÷ Negative Flow over n)',
    measures: 'MFI measures buying vs selling pressure like RSI, but weights each move by its volume.',
    construction: [
      'Typical Price = (High + Low + Close) ÷ 3.',
      'Raw Money Flow = Typical Price × Volume.',
      'Over n bars, sum the flows on up days and on down days.',
      'MFI = 100 − 100 ÷ (1 + positive-flow sum ÷ negative-flow sum).',
    ],
    reading: [
      '70 and above = overbought; 30 and below = oversold.',
      'Because it uses volume, high-volume moves count more than in plain RSI.',
      'A divergence from price hints at weakening pressure.',
    ],
  },
  ppo: {
    name: 'Percentage Price Oscillator (PPO)',
    blurb: 'A normalized MACD shown in percent, so it is comparable across any price level.',
    formula: 'PPO = ((Fast EMA − Slow EMA) ÷ Slow EMA) × 100   ·   Signal = EMA of PPO',
    measures: 'PPO measures the same momentum as MACD, but as a percentage — comparable across stocks and over long ranges.',
    construction: [
      'Compute the fast EMA and slow EMA of the close.',
      'PPO = (fast EMA − slow EMA) ÷ slow EMA × 100.',
      'Signal = an EMA of the PPO.',
      'Histogram = PPO − Signal.',
    ],
    reading: [
      'Above 0 = fast EMA is above slow EMA (uptrend bias).',
      'PPO crossing its Signal line = momentum turning.',
      'Being a %, it compares fairly between different-priced stocks.',
    ],
  },
  dmi: {
    name: 'Directional Movement Index (+DI, −DI, ADX)',
    blurb: 'Shows trend direction with the two DI lines and trend strength with the ADX.',
    formula: 'TR = max(H−L, |H−prevC|, |L−prevC|)   ·   +DI = +DM14÷TR14×100   ·   DX = |+DI−−DI|÷(+DI+−DI)×100   ·   ADX = Wilder avg of DX',
    measures: 'The DMI separates trend direction (+DI vs −DI) from trend strength (ADX).',
    construction: [
      'True Range = max(High−Low, |High−prevClose|, |Low−prevClose|).',
      '+DM / −DM = the part of today\'s range that lies outside yesterday\'s range.',
      'Wilder-smooth TR, +DM, −DM over n, then +DI = +DM14÷TR14×100 and −DI = −DM14÷TR14×100.',
      'DX = |+DI − −DI| ÷ (+DI + −DI) × 100; ADX = the Wilder average of DX.',
    ],
    reading: [
      '+DI above −DI = uptrend; −DI above +DI = downtrend.',
      'ADX above 25 and rising = a strong trend (up OR down — ADX is direction-agnostic).',
      'A falling ADX = the trend is weakening.',
    ],
  },
  rvol: {
    name: 'Relative Volume (RVOL)',
    blurb: 'RVOL compares today\'s volume to the average volume over a lookback period, showing whether participation is unusually high or low.',
    formula: 'Average Volume = SMA of Volume over n bars   ·   RVOL = Today\'s Volume ÷ Average Volume',
    measures: 'RVOL measures how today\'s volume compares to normal. A reading of 1.0 means average; 2.0 means twice the average volume.',
    construction: [
      'Calculate the Simple Moving Average (SMA) of volume over the lookback period n.',
      'Divide today\'s volume by that average: RVOL = Volume ÷ Avg Volume.',
      'A value of 1.0 is exactly average; above 1.0 is above average, below 1.0 is below average.',
      'The reference line at 1.0 is the key level — everything is measured relative to it.',
    ],
    reading: [
      'RVOL above 1.0 = above-average participation (confirms price moves, breakouts, reversals).',
      'RVOL above 2.0 = significantly elevated volume — high conviction move or climax.',
      'RVOL below 0.5 = very low participation — price moves on thin volume are less reliable.',
      'RVOL is most powerful as a confirming indicator: a breakout on high RVOL is far more credible than one on low volume.',
    ],
  },
  cmf: {
    name: 'Chaikin Money Flow (CMF)',
    blurb: 'CMF measures buying and selling pressure over a period by summing volume weighted by where the close falls in the high-low range.',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   MFV = Multiplier × Volume   ·   CMF = Sum(MFV, n) ÷ Sum(Volume, n)',
    measures: 'CMF measures net buying vs selling pressure as a ratio, oscillating between −1 and +1 (typically ±0.5 in practice).',
    construction: [
      'Step 1 — Money Flow Multiplier: ((Close−Low) − (High−Close)) ÷ (High−Low). Ranges from −1 (close at the low) to +1 (close at the high).',
      'Step 2 — Money Flow Volume (MFV): Multiplier × Volume for that bar.',
      'Step 3 — Over the lookback period n, sum all MFV values and sum all Volume values.',
      'Step 4 — CMF = Sum of MFV ÷ Sum of Volume. This normalizes by volume so big-volume days count more.',
    ],
    reading: [
      'Above 0 = net buying pressure (accumulation); below 0 = net selling pressure (distribution).',
      'A reading above +0.25 signals strong buying; below −0.25 signals strong selling.',
      'CMF crossing above 0 from below = a shift from distribution to accumulation.',
      'Note: ADL uses the same multiplier but as a running total; CMF is a windowed ratio — so it is bounded and mean-reverting.',
    ],
  },
  obv: {
    name: 'On Balance Volume (OBV)',
    blurb: 'OBV is a running volume total that adds volume on up days and subtracts it on down days.',
    formula: 'If Close > prev Close: OBV = prev OBV + Volume   ·   If Close < prev Close: OBV = prev OBV − Volume   ·   If unchanged: OBV = prev OBV',
    measures: 'OBV measures cumulative buying and selling pressure by tracking whether volume flows in (up day) or out (down day).',
    construction: [
      'Start with Day 1 volume as the initial OBV.',
      'Each subsequent day: if the close is higher than the previous close, add that day\'s volume to OBV.',
      'If the close is lower, subtract the volume. If unchanged, OBV stays the same.',
      'Plot the running total as a line — the absolute value does not matter, only the trend.',
    ],
    reading: [
      'Rising OBV = volume is flowing in on up days (accumulation / buying pressure).',
      'Falling OBV = volume is flowing out on down days (distribution / selling pressure).',
      'If price makes a new high but OBV does not, the breakout lacks volume support (bearish divergence).',
      'Developed by Joe Granville — the original volume-based indicator (CMT curriculum).',
    ],
  },
};

function fmt(v: number | null, d = 2) {
  return v === null || !Number.isFinite(v) ? '—' : v.toFixed(d);
}

export function IndicatorTool({ indicator }: { indicator: IndicatorKey }) {
  const meta = META[indicator];
  const bars = AAPL_SAMPLE;
  const N = bars.length;

  const usesEma = indicator === 'macd' || indicator === 'ppo';
  const usesPeriod = ['roc', 'rsi', 'stochastics', 'mfi', 'dmi', 'cmf', 'rvol'].includes(indicator);
  const noControls = indicator === 'adl' || indicator === 'obv';
  const [period, setPeriod] = useState(indicator === 'roc' ? 10 : indicator === 'cmf' ? 20 : indicator === 'rvol' ? 20 : 14);
  const [fast, setFast] = useState(12);
  const [slow, setSlow] = useState(26);
  const [signal, setSignal] = useState(9);
  const firstDate = bars[0].date;
  const lastDate = bars[N - 1].date;
  const [fromDate, setFromDate] = useState(bars[Math.max(0, N - 120)].date);
  const [toDate, setToDate] = useState(lastDate);
  const fromI = useMemo(() => { const i = bars.findIndex((b) => b.date >= fromDate); return i < 0 ? 0 : i; }, [bars, fromDate]);
  const toI = useMemo(() => { for (let i = N - 1; i >= 0; i--) if (bars[i].date <= toDate) return i; return N - 1; }, [bars, toDate, N]);
  const lo = Math.min(fromI, toI);
  const hi = Math.max(fromI, toI);
  const setPreset = (count: number) => { setFromDate(bars[Math.max(0, N - count)].date); setToDate(lastDate); };
  const PRESETS: [string, number][] = [['1M', 21], ['3M', 63], ['6M', 126], ['1Y', 252], ['5Y', N]];

  // compute on the FULL series, then show only the selected window
  const roc = useMemo(() => computeRoc(bars, period), [bars, period]);
  const rsi = useMemo(() => computeRsi(bars, period), [bars, period]);
  const macd = useMemo(() => computeMacd(bars, fast, slow, signal), [bars, fast, slow, signal]);
  const stoch = useMemo(() => computeStochastics(bars, period), [bars, period]);
  const adl = useMemo(() => computeAdl(bars), [bars]);
  const obv = useMemo(() => computeObv(bars), [bars]);
  const cmf = useMemo(() => computeCmf(bars, period), [bars, period]);
  const rvol = useMemo(() => computeRvol(bars, period), [bars, period]);
  const mfi = useMemo(() => computeMfi(bars, period), [bars, period]);
  const ppo = useMemo(() => computePpo(bars, fast, slow, signal), [bars, fast, slow, signal]);
  const dmi = useMemo(() => computeDmi(bars, period), [bars, period]);

  const sl = <T,>(arr: T[]) => arr.slice(lo, hi + 1);
  const dates = sl(bars.map((b) => b.date.slice(5)));
  const priceSeries = { label: 'Close', color: '#18181b', values: sl(bars.map((b) => b.close)) };

  const chart = (() => {
    if (indicator === 'roc')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`ROC (${period})`} indSuffix="%"
        indicators={[{ label: `ROC (${period})`, color: EMERALD, values: sl(roc.line) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    if (indicator === 'rsi')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`RSI (${period})`} indMin={0} indMax={100}
        indicators={[{ label: `RSI (${period})`, color: EMERALD, values: sl(rsi.line) }]} refLines={[{ value: 70, label: '70 overbought' }, { value: 30, label: '30 oversold' }]} />;
    if (indicator === 'macd')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="MACD"
        indicators={[{ label: 'MACD', color: BLUE, values: sl(macd.macdLine) }, { label: 'Signal', color: AMBER, values: sl(macd.signalLine) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    if (indicator === 'stochastics')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Stochastics %K/%D (${period})`} indMin={0} indMax={100}
        indicators={[{ label: '%K', color: EMERALD, values: sl(stoch.kLine) }, { label: '%D', color: AMBER, values: sl(stoch.dLine) }]} refLines={[{ value: 80, label: '80 overbought' }, { value: 20, label: '20 oversold' }]} />;
    if (indicator === 'adl')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="Accumulation / Distribution Line"
        indicators={[{ label: 'ADL', color: EMERALD, values: sl(adl.line) }]} />;
    if (indicator === 'obv')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="On Balance Volume (OBV)"
        indicators={[{ label: 'OBV', color: BLUE, values: sl(obv.line) }]} />;
    if (indicator === 'cmf')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Chaikin Money Flow (${period})`}
        indicators={[{ label: `CMF (${period})`, color: PURPLE, values: sl(cmf.line) }]}
        refLines={[{ value: 0, label: '0', color: '#9ca3af' }, { value: 0.25, label: '+0.25 strong buy' }, { value: -0.25, label: '-0.25 strong sell' }]} />;
    if (indicator === 'rvol')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Relative Volume (${period})`}
        indicators={[{ label: `RVOL (${period})`, color: AMBER, values: sl(rvol.line) }]}
        refLines={[{ value: 1, label: '1.0 average', color: '#9ca3af' }, { value: 2, label: '2.0 high' }]} />;
    if (indicator === 'mfi')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`MFI (${period})`} indMin={0} indMax={100}
        indicators={[{ label: `MFI (${period})`, color: EMERALD, values: sl(mfi.line) }]} refLines={[{ value: 70, label: '70 overbought' }, { value: 30, label: '30 oversold' }]} />;
    if (indicator === 'ppo')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="PPO" indSuffix="%"
        indicators={[{ label: 'PPO', color: BLUE, values: sl(ppo.ppoLine) }, { label: 'Signal', color: AMBER, values: sl(ppo.signalLine) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`DMI (${period})`} indMin={0}
      indicators={[{ label: '+DI', color: EMERALD, values: sl(dmi.plusDI) }, { label: '−DI', color: RED, values: sl(dmi.minusDI) }, { label: 'ADX', color: PURPLE, values: sl(dmi.adx) }]} refLines={[{ value: 25, label: '25 strong trend' }]} />;
  })();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Interactive Tool</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{meta.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{meta.blurb}</p>
      </div>

      {/* Controls */}
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        {usesEma ? (
          <div className="flex flex-wrap items-center gap-5">
            {([['Fast EMA', fast, setFast], ['Slow EMA', slow, setSlow], ['Signal', signal, setSignal]] as const).map(([lbl, val, set]) => (
              <label key={lbl} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="font-medium">{lbl}</span>
                <input type="number" min={2} max={50} value={val} onChange={(e) => set(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
              </label>
            ))}
          </div>
        ) : usesPeriod ? (
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="font-medium whitespace-nowrap">Period: <span className="text-emerald-700">{period}</span></span>
            <input type="range" min={2} max={20} value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-full max-w-xs accent-emerald-600" />
          </label>
        ) : (
          <p className="text-sm text-zinc-600">
            {indicator === 'obv' ? 'OBV has no period setting — it is a cumulative running total of volume, adding on up days and subtracting on down days.' : 'The ADL has no period setting — it is a cumulative running total of volume.'}
          </p>
        )}

        {/* Date range */}
        <div className="space-y-2 border-t border-zinc-100 pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <span className="font-medium">From</span>
              <input type="date" min={firstDate} max={lastDate} value={fromDate} onChange={(e) => e.target.value && setFromDate(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <span className="font-medium">To</span>
              <input type="date" min={firstDate} max={lastDate} value={toDate} onChange={(e) => e.target.value && setToDate(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
            </label>
            <div className="flex items-center gap-1">
              {PRESETS.map(([lbl, cnt]) => (
                <button key={lbl} type="button" onClick={() => setPreset(cnt)}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700">
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-400">Showing {hi - lo + 1} of {N} bars ({bars[lo].date} → {bars[hi].date}). Calculations use the full 5-year history, so values are correct from the first day shown.</p>
        </div>
      </div>

      {/* Combined chart: price on top, indicator below */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {chart}
      </div>

      {/* Calculation table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <p className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">Step-by-step calculation (selected dates)</p>
        <div className="max-h-[420px] overflow-auto">
          <CalcTable indicator={indicator} roc={sl(roc.rows)} rsi={sl(rsi.rows)} macd={sl(macd.rows)}
            stoch={sl(stoch.rows)} adl={sl(adl.rows)} mfi={sl(mfi.rows)} ppo={sl(ppo.rows)} dmi={sl(dmi.rows)} obv={sl(obv.rows)} cmf={sl(cmf.rows)} rvol={sl(rvol.rows)} />
        </div>
      </div>

      {/* Detailed explanation BELOW the table */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-emerald-900">What {meta.name} measures</h2>
          <p className="mt-1 text-sm text-zinc-700">{meta.measures}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">How it is constructed</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-zinc-700">{meta.construction.map((p) => <li key={p}>{p}</li>)}</ol>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">How to read it</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">{meta.reading.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Formula</p>
          <p className="mt-1 font-mono text-[13px] text-zinc-800">{meta.formula}</p>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Sample data: {N} AAPL daily bars, for learning the calculation. <Link href="/tools" className="text-emerald-700 underline">Back to all tools</Link>
      </p>
    </div>
  );
}

function th(label: string) { return <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-600 first:text-left">{label}</th>; }
function td(v: ReactNode, first = false) { return <td className={`whitespace-nowrap px-3 py-1.5 ${first ? 'text-left text-zinc-500' : 'text-right tabular-nums text-zinc-800'}`}>{v}</td>; }
function fmtInt(v: number | null) { return v === null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('en-US'); }

function CalcTable({ indicator, roc, rsi, macd, stoch, adl, mfi, ppo, dmi, obv, cmf, rvol }: {
  indicator: IndicatorKey;
  roc: ReturnType<typeof computeRoc>['rows'];
  rsi: ReturnType<typeof computeRsi>['rows'];
  macd: ReturnType<typeof computeMacd>['rows'];
  stoch: ReturnType<typeof computeStochastics>['rows'];
  adl: ReturnType<typeof computeAdl>['rows'];
  mfi: ReturnType<typeof computeMfi>['rows'];
  ppo: ReturnType<typeof computePpo>['rows'];
  dmi: ReturnType<typeof computeDmi>['rows'];
  obv: ReturnType<typeof computeObv>['rows'];
  cmf: ReturnType<typeof computeCmf>['rows'];
  rvol: ReturnType<typeof computeRvol>['rows'];
}) {
  if (indicator === 'roc') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('ROC %')}</tr></thead>
        <tbody>{roc.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.roc))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'rsi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Change')}{th('Gain')}{th('Loss')}{th('Avg Gain')}{th('Avg Loss')}{th('RS')}{th('RSI')}</tr></thead>
        <tbody>{rsi.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.change))}{td(fmt(r.gain))}{td(fmt(r.loss))}{td(fmt(r.avgGain))}{td(fmt(r.avgLoss))}{td(fmt(r.rs))}{td(fmt(r.rsi))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'stochastics') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Low n')}{th('High n')}{th('%K')}{th('%D')}</tr></thead>
        <tbody>{stoch.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.lowN))}{td(fmt(r.highN))}{td(fmt(r.k))}{td(fmt(r.d))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'adl') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Multiplier')}{th('Adj Volume')}{th('ADL')}</tr></thead>
        <tbody>{adl.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(fmt(r.multiplier))}{td(fmtInt(r.adjVol))}{td(fmtInt(r.adl))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'mfi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Typ Price')}{th('Pos Flow')}{th('Neg Flow')}{th('MFI')}</tr></thead>
        <tbody>{mfi.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.typical))}{td(fmtInt(r.posFlow))}{td(fmtInt(r.negFlow))}{td(fmt(r.mfi))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'ppo') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Fast EMA')}{th('Slow EMA')}{th('PPO %')}{th('Signal')}{th('Histogram')}</tr></thead>
        <tbody>{ppo.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.emaFast))}{td(fmt(r.emaSlow))}{td(fmt(r.ppo))}{td(fmt(r.signal))}{td(fmt(r.hist))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'dmi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('TR')}{th('+DI')}{th('−DI')}{th('DX')}{th('ADX')}</tr></thead>
        <tbody>{dmi.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.tr))}{td(fmt(r.plusDI))}{td(fmt(r.minusDI))}{td(fmt(r.dx))}{td(fmt(r.adx))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'obv') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Direction')}{th('OBV')}</tr></thead>
        <tbody>{obv.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(<span className={r.direction === '+' ? 'text-emerald-600 font-semibold' : r.direction === '−' ? 'text-red-500 font-semibold' : 'text-zinc-400'}>{r.direction}</span>)}{td(fmtInt(r.obv))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'cmf') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Multiplier')}{th('MFV')}{th('Sum MFV')}{th('Sum Vol')}{th('CMF')}</tr></thead>
        <tbody>{cmf.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(fmt(r.multiplier))}{td(fmtInt(r.mfv))}{td(r.sumMfv === null ? '—' : fmtInt(r.sumMfv))}{td(r.sumVol === null ? '—' : fmtInt(r.sumVol))}{td(fmt(r.cmf, 4))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'rvol') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Avg Volume')}{th('RVOL')}</tr></thead>
        <tbody>{rvol.map((r) => <tr key={r.date} className="border-t border-zinc-50">
          {td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(r.avgVolume === null ? '—' : fmtInt(r.avgVolume))}
          {td(<span className={r.rvol === null ? '' : r.rvol >= 2 ? 'text-red-600 font-semibold' : r.rvol >= 1 ? 'text-emerald-600 font-semibold' : 'text-zinc-400'}>{r.rvol === null ? '—' : fmt(r.rvol)}</span>)}
        </tr>)}</tbody>
      </table>
    );
  }
  return (
    <table className="w-full text-[13px]">
      <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Fast EMA')}{th('Slow EMA')}{th('MACD')}{th('Signal')}{th('Histogram')}</tr></thead>
      <tbody>{macd.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.emaFast))}{td(fmt(r.emaSlow))}{td(fmt(r.macd))}{td(fmt(r.signal))}{td(fmt(r.hist))}</tr>)}</tbody>
    </table>
  );
}
