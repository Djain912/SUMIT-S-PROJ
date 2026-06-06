'use client';

import { useMemo } from 'react';

export type ChartSeries = { label: string; color: string; values: (number | null)[] };
export type RefLine = { value: number; label: string; color?: string };

type Props = {
  series: ChartSeries[];
  categories: string[]; // x labels (dates)
  height?: number;
  refLines?: RefLine[];
  yMin?: number;
  yMax?: number;
  valueSuffix?: string;
};

// Lightweight, dependency-free line chart drawn with SVG. Renders multiple
// series with gaps for null (warm-up) points, optional horizontal reference
// lines, a y-axis scale and a few x-axis date labels.
export function LineChart({ series, categories, height = 240, refLines = [], yMin, yMax, valueSuffix = '' }: Props) {
  const W = 720;
  const H = height;
  const padL = 48, padR = 14, padT = 12, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = categories.length;

  const { lo, hi } = useMemo(() => {
    const nums: number[] = [];
    series.forEach((s) => s.values.forEach((v) => v !== null && Number.isFinite(v) && nums.push(v as number)));
    refLines.forEach((r) => nums.push(r.value));
    let mn = yMin ?? Math.min(...nums);
    let mx = yMax ?? Math.max(...nums);
    if (!Number.isFinite(mn) || !Number.isFinite(mx)) { mn = 0; mx = 1; }
    if (mn === mx) { mn -= 1; mx += 1; }
    const pad = yMin === undefined && yMax === undefined ? (mx - mn) * 0.08 : 0;
    return { lo: mn - pad, hi: mx + pad };
  }, [series, refLines, yMin, yMax]);

  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;

  const pathFor = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v as number).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const yticks = [hi, (hi + lo) / 2, lo];
  const xidx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* y gridlines + labels */}
        {yticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{fmt(t)}{valueSuffix}</text>
          </g>
        ))}
        {/* reference lines */}
        {refLines.map((r, i) => (
          <g key={`r${i}`}>
            <line x1={padL} x2={W - padR} y1={y(r.value)} y2={y(r.value)} stroke={r.color ?? '#f59e0b'} strokeWidth={1} strokeDasharray="4 3" />
            <text x={W - padR} y={y(r.value) - 3} textAnchor="end" fontSize={9} fill={r.color ?? '#f59e0b'}>{r.label}</text>
          </g>
        ))}
        {/* x labels */}
        {xidx.map((i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={10} fill="#71717a">
            {categories[i]}
          </text>
        ))}
        {/* series */}
        {series.map((s, i) => (
          <path key={i} d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </svg>
      {/* legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
