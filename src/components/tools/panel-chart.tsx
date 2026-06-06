'use client';

import { useMemo } from 'react';
import type { ChartSeries, RefLine } from '@/components/tools/line-chart';

type Props = {
  categories: string[];
  price: ChartSeries;            // top panel
  indicators: ChartSeries[];     // bottom panel
  priceLabel?: string;
  indicatorLabel: string;
  refLines?: RefLine[];
  indMin?: number;
  indMax?: number;
  indSuffix?: string;
};

// One combined chart: price panel on top, indicator panel below, sharing the
// same x-axis (dates) — the classic technical-analysis layout. Pure SVG.
export function PanelChart({ categories, price, indicators, priceLabel = 'Price', indicatorLabel, refLines = [], indMin, indMax, indSuffix = '' }: Props) {
  const W = 760, padL = 52, padR = 16, padT = 26;
  const priceH = 200, gap = 30, indH = 150, padB = 26;
  const H = padT + priceH + gap + indH + padB;
  const innerW = W - padL - padR;
  const n = categories.length;

  const range = (vals: (number | null)[], forceMin?: number, forceMax?: number, extra: number[] = []) => {
    const nums = [...vals.filter((v): v is number => v !== null && Number.isFinite(v)), ...extra];
    let mn = forceMin ?? Math.min(...nums);
    let mx = forceMax ?? Math.max(...nums);
    if (!Number.isFinite(mn) || !Number.isFinite(mx)) { mn = 0; mx = 1; }
    if (mn === mx) { mn -= 1; mx += 1; }
    const pad = forceMin === undefined && forceMax === undefined ? (mx - mn) * 0.08 : 0;
    return { mn: mn - pad, mx: mx + pad };
  };

  const pr = useMemo(() => range(price.values), [price]);
  const ir = useMemo(() => range(indicators.flatMap((s) => s.values), indMin, indMax, refLines.map((r) => r.value)), [indicators, indMin, indMax, refLines]);

  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yIn = (v: number, top: number, h: number, mn: number, mx: number) => top + h - ((v - mn) / (mx - mn)) * h;
  const yP = (v: number) => yIn(v, padT, priceH, pr.mn, pr.mx);
  const indTop = padT + priceH + gap;
  const yI = (v: number) => yIn(v, indTop, indH, ir.mn, ir.mx);

  const path = (vals: (number | null)[], yfn: (v: number) => number) => {
    let d = '', pen = false;
    vals.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${yfn(v as number).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
  const xidx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 4), Math.floor((n - 1) / 2), Math.floor(3 * (n - 1) / 4), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* panel titles */}
        <text x={padL} y={16} fontSize={12} fontWeight={600} fill="#18181b">{priceLabel}</text>
        <text x={padL} y={indTop - 8} fontSize={12} fontWeight={600} fill="#047857">{indicatorLabel}</text>

        {/* price gridlines + labels */}
        {[pr.mx, (pr.mx + pr.mn) / 2, pr.mn].map((t, i) => (
          <g key={`p${i}`}>
            <line x1={padL} x2={W - padR} y1={yP(t)} y2={yP(t)} stroke="#e4e4e7" strokeWidth={1} />
            <text x={padL - 6} y={yP(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{fmt(t)}</text>
          </g>
        ))}
        {/* price line */}
        <path d={path(price.values, yP)} fill="none" stroke={price.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* indicator gridlines + labels */}
        {[ir.mx, (ir.mx + ir.mn) / 2, ir.mn].map((t, i) => (
          <g key={`i${i}`}>
            <line x1={padL} x2={W - padR} y1={yI(t)} y2={yI(t)} stroke="#e4e4e7" strokeWidth={1} />
            <text x={padL - 6} y={yI(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{fmt(t)}{indSuffix}</text>
          </g>
        ))}
        {/* indicator reference lines */}
        {refLines.map((r, i) => (
          <g key={`r${i}`}>
            <line x1={padL} x2={W - padR} y1={yI(r.value)} y2={yI(r.value)} stroke={r.color ?? '#f59e0b'} strokeWidth={1} strokeDasharray="4 3" />
            <text x={W - padR} y={yI(r.value) - 3} textAnchor="end" fontSize={9} fill={r.color ?? '#f59e0b'}>{r.label}</text>
          </g>
        ))}
        {/* indicator lines */}
        {indicators.map((s, i) => (
          <path key={i} d={path(s.values, yI)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* shared x labels */}
        {xidx.map((i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={10} fill="#71717a">
            {categories[i]}
          </text>
        ))}
      </svg>
      {/* legend (indicator series only if more than one) */}
      {indicators.length > 1 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
          {indicators.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
