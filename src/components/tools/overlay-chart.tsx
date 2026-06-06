'use client';

import { useMemo } from 'react';

type Series = (number | null)[];

type OverlayChartProps = {
  categories: string[];
  price: { label: string; values: number[] };
  overlay: { label: string; color: string; values: Series };
  // optional second panel (for Distance from MA)
  indicator?: {
    label: string;
    values: Series;
    color: string;
    refLines?: { value: number; label: string; color?: string }[];
    suffix?: string;
  };
};

export function OverlayChart({ categories, price, overlay, indicator }: OverlayChartProps) {
  const W = 760, padL = 52, padR = 16, padT = 26, padB = 26;
  const priceH = indicator ? 200 : 300;
  const gap = indicator ? 30 : 0;
  const indH = indicator ? 150 : 0;
  const H = padT + priceH + gap + indH + padB;
  const innerW = W - padL - padR;
  const n = categories.length;

  const range = (vals: (number | null | number)[], extra: number[] = []) => {
    const nums = [...vals.filter((v): v is number => v !== null && Number.isFinite(v as number)), ...extra];
    if (nums.length === 0) return { mn: 0, mx: 1 };
    let mn = Math.min(...nums), mx = Math.max(...nums);
    if (mn === mx) { mn -= 1; mx += 1; }
    const pad = (mx - mn) * 0.08;
    return { mn: mn - pad, mx: mx + pad };
  };

  // price panel range: encompass BOTH price and overlay MA
  const pr = useMemo(() => range(
    [...price.values, ...overlay.values],
  ), [price.values, overlay.values]);

  const ir = useMemo(() => indicator
    ? range(indicator.values, (indicator.refLines ?? []).map((r) => r.value))
    : { mn: 0, mx: 1 },
  [indicator]);

  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yIn = (v: number, top: number, h: number, mn: number, mx: number) => top + h - ((v - mn) / (mx - mn)) * h;
  const yP = (v: number) => yIn(v, padT, priceH, pr.mn, pr.mx);
  const indTop = padT + priceH + gap;
  const yI = (v: number) => yIn(v, indTop, indH, ir.mn, ir.mx);

  const path = (vals: (number | null)[], yfn: (v: number) => number) => {
    let d = '', pen = false;
    vals.forEach((v, i) => {
      if (v === null || !Number.isFinite(v as number)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${yfn(v as number).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const fmt = (v: number) => (Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2));
  const xidx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 4), Math.floor((n - 1) / 2), Math.floor(3 * (n - 1) / 4), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* price panel label */}
        <text x={padL} y={16} fontSize={12} fontWeight={600} fill="#18181b">Price</text>

        {/* price gridlines + y-labels */}
        {[pr.mx, (pr.mx + pr.mn) / 2, pr.mn].map((t, i) => (
          <g key={`p${i}`}>
            <line x1={padL} x2={W - padR} y1={yP(t)} y2={yP(t)} stroke="#e4e4e7" strokeWidth={1} />
            <text x={padL - 6} y={yP(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{fmt(t)}</text>
          </g>
        ))}

        {/* price line */}
        <path d={path(price.values, yP)} fill="none" stroke="#18181b" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* overlay MA line */}
        <path d={path(overlay.values, yP)} fill="none" stroke={overlay.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* optional indicator panel */}
        {indicator && (
          <>
            <text x={padL} y={indTop - 8} fontSize={12} fontWeight={600} fill="#047857">{indicator.label}</text>
            {[ir.mx, (ir.mx + ir.mn) / 2, ir.mn].map((t, i) => (
              <g key={`i${i}`}>
                <line x1={padL} x2={W - padR} y1={yI(t)} y2={yI(t)} stroke="#e4e4e7" strokeWidth={1} />
                <text x={padL - 6} y={yI(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{t.toFixed(2)}{indicator.suffix ?? ''}</text>
              </g>
            ))}
            {(indicator.refLines ?? []).map((r, i) => (
              <g key={`r${i}`}>
                <line x1={padL} x2={W - padR} y1={yI(r.value)} y2={yI(r.value)} stroke={r.color ?? '#9ca3af'} strokeWidth={1} strokeDasharray="4 3" />
                <text x={W - padR} y={yI(r.value) - 3} textAnchor="end" fontSize={9} fill={r.color ?? '#9ca3af'}>{r.label}</text>
              </g>
            ))}
            <path d={path(indicator.values, yI)} fill="none" stroke={indicator.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* shared x labels */}
        {xidx.map((i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            fontSize={10} fill="#71717a">
            {categories[i]}
          </text>
        ))}
      </svg>

      {/* legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-5">
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="inline-block h-[2px] w-5 rounded-sm bg-zinc-900" />{price.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="inline-block h-[3px] w-5 rounded-sm" style={{ backgroundColor: overlay.color }} />{overlay.label}
        </span>
        {indicator && (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="inline-block h-[2px] w-5 rounded-sm" style={{ backgroundColor: indicator.color }} />{indicator.label}
          </span>
        )}
      </div>
    </div>
  );
}
