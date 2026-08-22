// Scores a list of PriceSeries and returns the most noteworthy observations.
// Each observation maps to one Social Studio post.

import type { PriceSeries } from './fetch-market-data';
import { lineChartSvg, barChartSvg } from './chart-svg';

export type Observation = {
  symbol: string;
  metricName: string;
  headline: string;         // raw headline before AI polish
  subtext: string;
  chartSvg: string;
  chartType: 'line' | 'bar' | 'hbar';
  score: number;
  currentVal: number;
  sourceLine: string;
  contextNote: string;
};

function round2(n: number) { return Math.round(n * 100) / 100; }

function fmtPct(n: number, sign = true) {
  const s = (n >= 0 && sign ? '+' : '') + n.toFixed(1) + '%';
  return s;
}

function prefixFor(currency: string) {
  return currency === 'INR' ? '₹' : '$';
}

export function detectObservations(series: PriceSeries[]): Observation[] {
  const obs: Observation[] = [];

  for (const s of series) {
    const prefix = prefixFor(s.currency);

    // ── 52-week HIGH ────────────────────────────────────────────────────────
    if (s.isAtHigh52w) {
      const score = 90 + Math.abs(s.pct1y) * 0.5; // higher if big 1y gain
      obs.push({
        symbol: s.symbol,
        metricName: '52-Week High',
        headline: `${s.name} hits a new 52-week high`,
        subtext: `Trading at ${prefix}${s.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })} — up ${fmtPct(s.pct1y)} over the past year`,
        chartSvg: lineChartSvg({
          dates: s.dates,
          values: s.closes,
          label: s.name,
          valuePrefix: prefix,
        }),
        chartType: 'line',
        score,
        currentVal: round2(s.current),
        sourceLine: 'Yahoo Finance',
        contextNote: `pct1d: ${fmtPct(s.pct1d)}, pct1m: ${fmtPct(s.pct1m)}, pct1y: ${fmtPct(s.pct1y)}`,
      });
    }

    // ── 52-week LOW ─────────────────────────────────────────────────────────
    if (s.isAtLow52w) {
      const score = 88 + Math.abs(s.pct1y) * 0.5;
      obs.push({
        symbol: s.symbol,
        metricName: '52-Week Low',
        headline: `${s.name} falls to a new 52-week low`,
        subtext: `Trading at ${prefix}${s.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })} — down ${fmtPct(s.pct1y)} over the past year`,
        chartSvg: lineChartSvg({
          dates: s.dates,
          values: s.closes,
          label: s.name,
          valuePrefix: prefix,
        }),
        chartType: 'line',
        score,
        currentVal: round2(s.current),
        sourceLine: 'Yahoo Finance',
        contextNote: `pct1d: ${fmtPct(s.pct1d)}, pct1m: ${fmtPct(s.pct1m)}, pct1y: ${fmtPct(s.pct1y)}`,
      });
    }

    // ── Large single-day move ────────────────────────────────────────────────
    const bigMoveThreshold = s.symbol === '^VIX' ? 10 : 2.5;
    if (Math.abs(s.pct1d) >= bigMoveThreshold) {
      const dir = s.pct1d > 0 ? 'surges' : 'plunges';
      obs.push({
        symbol: s.symbol,
        metricName: 'Large Daily Move',
        headline: `${s.name} ${dir} ${fmtPct(s.pct1d)} in a single session`,
        subtext: `Closed at ${prefix}${s.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        chartSvg: lineChartSvg({
          dates: s.dates.slice(-60),
          values: s.closes.slice(-60),
          label: s.name,
          valuePrefix: prefix,
        }),
        chartType: 'line',
        score: 70 + Math.abs(s.pct1d) * 2,
        currentVal: round2(s.current),
        sourceLine: 'Yahoo Finance',
        contextNote: `pct1d: ${fmtPct(s.pct1d)}, pct1m: ${fmtPct(s.pct1m)}`,
      });
    }

    // ── Strong 1-month trend ─────────────────────────────────────────────────
    if (Math.abs(s.pct1m) >= 8) {
      const dir = s.pct1m > 0 ? 'gained' : 'lost';
      obs.push({
        symbol: s.symbol,
        metricName: '1-Month Trend',
        headline: `${s.name} has ${dir} ${fmtPct(Math.abs(s.pct1m), false)} in just one month`,
        subtext: `Current: ${prefix}${s.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}  ·  YTD: ${fmtPct(s.pct1y)}`,
        chartSvg: lineChartSvg({
          dates: s.dates,
          values: s.closes,
          label: s.name,
          valuePrefix: prefix,
        }),
        chartType: 'line',
        score: 55 + Math.abs(s.pct1m) * 1.5,
        currentVal: round2(s.current),
        sourceLine: 'Yahoo Finance',
        contextNote: `pct1m: ${fmtPct(s.pct1m)}, pct3m: ${fmtPct(s.pct3m)}, pct1y: ${fmtPct(s.pct1y)}`,
      });
    }

    // ── VIX extreme ─────────────────────────────────────────────────────────
    if (s.symbol === '^VIX') {
      if (s.current >= 30) {
        obs.push({
          symbol: s.symbol,
          metricName: 'VIX Extreme',
          headline: `Fear gauge VIX spikes to ${s.current.toFixed(1)} — market in distress`,
          subtext: 'Readings above 30 historically mark periods of elevated fear and opportunity for contrarian buyers.',
          chartSvg: lineChartSvg({
            dates: s.dates,
            values: s.closes,
            label: 'VIX',
          }),
          chartType: 'line',
          score: 85 + (s.current - 30) * 0.5,
          currentVal: round2(s.current),
          sourceLine: 'CBOE / Yahoo Finance',
          contextNote: `pct1d: ${fmtPct(s.pct1d)}, high52w: ${s.high52w.toFixed(1)}`,
        });
      } else if (s.current <= 12) {
        obs.push({
          symbol: s.symbol,
          metricName: 'VIX Complacency',
          headline: `VIX at ${s.current.toFixed(1)} — extreme complacency in markets`,
          subtext: 'Historically low volatility often precedes sharp market reversals.',
          chartSvg: lineChartSvg({
            dates: s.dates,
            values: s.closes,
            label: 'VIX',
          }),
          chartType: 'line',
          score: 75,
          currentVal: round2(s.current),
          sourceLine: 'CBOE / Yahoo Finance',
          contextNote: `pct1d: ${fmtPct(s.pct1d)}, low52w: ${s.low52w.toFixed(1)}`,
        });
      }
    }

    // ── Strong 1-year performer (informational) ──────────────────────────────
    if (Math.abs(s.pct1y) >= 30 && !s.isAtHigh52w && !s.isAtLow52w) {
      const dir = s.pct1y > 0 ? 'gained' : 'fallen';
      obs.push({
        symbol: s.symbol,
        metricName: '1-Year Performance',
        headline: `${s.name} has ${dir} ${fmtPct(Math.abs(s.pct1y), false)} over the past year`,
        subtext: `Current: ${prefix}${s.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        chartSvg: lineChartSvg({
          dates: s.dates,
          values: s.closes,
          label: s.name,
          valuePrefix: prefix,
        }),
        chartType: 'line',
        score: 45 + Math.abs(s.pct1y) * 0.8,
        currentVal: round2(s.current),
        sourceLine: 'Yahoo Finance',
        contextNote: `pct1m: ${fmtPct(s.pct1m)}, pct3m: ${fmtPct(s.pct3m)}, pct1y: ${fmtPct(s.pct1y)}`,
      });
    }
  }

  // ── Cross-asset comparison bar chart ─────────────────────────────────────
  // Always generate a "1-month returns" comparison post
  const monthly = series
    .filter((s) => ['^NSEI', 'GC=F', 'CL=F', '^GSPC', 'BTC-USD', 'USDINR=X'].includes(s.symbol))
    .map((s) => ({ label: s.name.replace(' Composite', '').replace(' (USD)', '').replace(' (WTI)', ''), value: round2(s.pct1m) }))
    .sort((a, b) => b.value - a.value);

  if (monthly.length >= 3) {
    obs.push({
      symbol: 'MULTI',
      metricName: 'Cross-Asset Returns',
      headline: 'One-month returns across asset classes',
      subtext: monthly.map((m) => `${m.label}: ${fmtPct(m.value)}`).join('  ·  '),
      chartSvg: barChartSvg({
        items: monthly,
        title: '1-Month Returns (%)',
        valueSuffix: '%',
        highlightPositive: true,
      }),
      chartType: 'bar',
      score: 60,
      currentVal: 0,
      sourceLine: 'Yahoo Finance',
      contextNote: 'cross-asset monthly comparison',
    });
  }

  // Sort by score descending, return top 5
  obs.sort((a, b) => b.score - a.score);
  // Deduplicate same symbol (keep highest score)
  const seen = new Set<string>();
  return obs.filter((o) => {
    const key = o.symbol + ':' + o.metricName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
