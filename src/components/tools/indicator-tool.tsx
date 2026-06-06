'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import { computeRoc, computeMacd, computeRsi } from '@/lib/tools/indicators';
import { PanelChart } from '@/components/tools/panel-chart';

export type IndicatorKey = 'roc' | 'macd' | 'rsi';

const EMERALD = '#047857';
const BLUE = '#2563eb';
const AMBER = '#d97706';

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
};

function fmt(v: number | null, d = 2) {
  return v === null || !Number.isFinite(v) ? '—' : v.toFixed(d);
}

export function IndicatorTool({ indicator }: { indicator: IndicatorKey }) {
  const meta = META[indicator];
  const bars = AAPL_SAMPLE;
  const N = bars.length;

  const [period, setPeriod] = useState(indicator === 'rsi' ? 14 : 10);
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
    return <PanelChart categories={dates} price={priceSeries} indicatorLabel="MACD"
      indicators={[{ label: 'MACD', color: BLUE, values: sl(macd.macdLine) }, { label: 'Signal', color: AMBER, values: sl(macd.signalLine) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
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
        {indicator === 'macd' ? (
          <div className="flex flex-wrap items-center gap-5">
            {([['Fast EMA', fast, setFast], ['Slow EMA', slow, setSlow], ['Signal', signal, setSignal]] as const).map(([lbl, val, set]) => (
              <label key={lbl} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="font-medium">{lbl}</span>
                <input type="number" min={2} max={50} value={val} onChange={(e) => set(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
              </label>
            ))}
          </div>
        ) : (
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="font-medium whitespace-nowrap">Period: <span className="text-emerald-700">{period}</span></span>
            <input type="range" min={2} max={20} value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-full max-w-xs accent-emerald-600" />
          </label>
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
          <CalcTable indicator={indicator} roc={sl(roc.rows)} rsi={sl(rsi.rows)} macd={sl(macd.rows)} />
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
        Sample data: {N} AAPL daily bars, for learning the calculation. <Link href="/user/notes" className="text-emerald-700 underline">Back to notes</Link>
      </p>
    </div>
  );
}

function th(label: string) { return <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-600 first:text-left">{label}</th>; }
function td(v: ReactNode, first = false) { return <td className={`whitespace-nowrap px-3 py-1.5 ${first ? 'text-left text-zinc-500' : 'text-right tabular-nums text-zinc-800'}`}>{v}</td>; }

function CalcTable({ indicator, roc, rsi, macd }: {
  indicator: IndicatorKey;
  roc: ReturnType<typeof computeRoc>['rows'];
  rsi: ReturnType<typeof computeRsi>['rows'];
  macd: ReturnType<typeof computeMacd>['rows'];
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
  return (
    <table className="w-full text-[13px]">
      <thead className="sticky top-0 bg-zinc-50"><tr>{th('Date')}{th('Close')}{th('Fast EMA')}{th('Slow EMA')}{th('MACD')}{th('Signal')}{th('Histogram')}</tr></thead>
      <tbody>{macd.map((r) => <tr key={r.date} className="border-t border-zinc-50">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.emaFast))}{td(fmt(r.emaSlow))}{td(fmt(r.macd))}{td(fmt(r.signal))}{td(fmt(r.hist))}</tr>)}</tbody>
    </table>
  );
}
