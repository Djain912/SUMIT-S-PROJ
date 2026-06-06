'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import { computeRoc, computeMacd, computeRsi } from '@/lib/tools/indicators';
import { LineChart } from '@/components/tools/line-chart';

export type IndicatorKey = 'roc' | 'macd' | 'rsi';

const EMERALD = '#047857';
const BLUE = '#2563eb';
const AMBER = '#d97706';

const META: Record<IndicatorKey, { name: string; blurb: string; formula: string; points: string[] }> = {
  roc: {
    name: 'Rate of Change (ROC)',
    blurb: 'ROC shows how much price has changed, in percent, compared with a set number of bars ago.',
    formula: 'ROC = ((Current Close − Close n bars ago) ÷ Close n bars ago) × 100',
    points: [
      'Above the 0 line = price is higher than n bars ago (upward momentum).',
      'Below the 0 line = price is lower than n bars ago (downward momentum).',
      'It is unbounded, but the value is meaningful — it is the actual % change.',
    ],
  },
  macd: {
    name: 'MACD',
    blurb: 'MACD measures momentum as the gap between a fast and a slow moving average of price.',
    formula: 'MACD = Fast EMA − Slow EMA · Signal = EMA of MACD · Histogram = MACD − Signal',
    points: [
      'MACD above 0 = fast EMA is above slow EMA (bullish).',
      'MACD above its Signal line = momentum strengthening (histogram positive).',
      'It is unbounded — focus on direction and crossovers, not the value.',
    ],
  },
  rsi: {
    name: 'Relative Strength Index (RSI)',
    blurb: 'RSI compares average gains to average losses to show momentum on a fixed 0–100 scale.',
    formula: 'RS = Average Gain ÷ Average Loss · RSI = 100 − (100 ÷ (1 + RS))',
    points: [
      '70 and above = overbought (relatively high). 30 and below = oversold (relatively low).',
      '50 is the midline: above 50 gains dominate, below 50 losses dominate.',
      'Uses Wilder smoothing; the default exam period is 14.',
    ],
  },
};

function fmt(v: number | null, d = 2) {
  return v === null || !Number.isFinite(v) ? '—' : v.toFixed(d);
}

export function IndicatorTool({ indicator }: { indicator: IndicatorKey }) {
  const meta = META[indicator];
  const bars = AAPL_SAMPLE;
  const dates = bars.map((b) => b.date.slice(5)); // MM-DD
  const closeSeries = bars.map((b) => b.close);

  const [period, setPeriod] = useState(indicator === 'rsi' ? 14 : 10);
  const [fast, setFast] = useState(12);
  const [slow, setSlow] = useState(26);
  const [signal, setSignal] = useState(9);

  const roc = useMemo(() => computeRoc(bars, period), [bars, period]);
  const rsi = useMemo(() => computeRsi(bars, period), [bars, period]);
  const macd = useMemo(() => computeMacd(bars, fast, slow, signal), [bars, fast, slow, signal]);

  const indicatorChart = (() => {
    if (indicator === 'roc')
      return <LineChart categories={dates} series={[{ label: `ROC (${period})`, color: EMERALD, values: roc.line }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} valueSuffix="%" />;
    if (indicator === 'rsi')
      return <LineChart categories={dates} series={[{ label: `RSI (${period})`, color: EMERALD, values: rsi.line }]} refLines={[{ value: 70, label: '70 overbought' }, { value: 30, label: '30 oversold' }]} yMin={0} yMax={100} />;
    return <LineChart categories={dates} series={[{ label: 'MACD', color: BLUE, values: macd.macdLine }, { label: 'Signal', color: AMBER, values: macd.signalLine }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Interactive Tool</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{meta.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{meta.blurb}</p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
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
        <p className="mt-2 text-xs text-zinc-500">Move the controls and watch the chart and table update instantly.</p>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-800">Apple (AAPL) — Closing Price</p>
          <LineChart categories={dates} series={[{ label: 'Close', color: '#18181b', values: closeSeries }]} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-800">{meta.name}</p>
          {indicatorChart}
        </div>
      </div>

      {/* Formula + explanation */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-900">How it is calculated</p>
        <p className="mt-1 font-mono text-[13px] text-emerald-800">{meta.formula}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {meta.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>

      {/* Calculation table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <p className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">Step-by-step calculation</p>
        <div className="max-h-[420px] overflow-auto">
          <CalcTable indicator={indicator} roc={roc.rows} rsi={rsi.rows} macd={macd.rows} />
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Sample data: 35 recent AAPL daily bars, for learning the calculation. <Link href="/user/notes" className="text-emerald-700 underline">Back to notes</Link>
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
