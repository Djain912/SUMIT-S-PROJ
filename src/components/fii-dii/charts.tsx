'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import {
  COLORS, axisCr, cr, fmtDate, fmtMonth, lastDays, longShare, niceTicks, num,
  type CashDay, type FnoDay, type MonthTotal,
} from '@/lib/fii-dii/format';
import { Segmented, Swatch } from './shell';

// On narrow screens charts keep a readable width and scroll; start at the latest data.
function ChartScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollLeft = el.scrollWidth; }, []);
  return <div ref={ref} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">{children}</div>;
}

// Brand mark for screenshots: faint centred wordmark + a small source tag.
function ChartMark({ x0, x1, y0, y1, width }: { x0: number; x1: number; y0: number; y1: number; width: number }) {
  const w = Math.min(190, (x1 - x0) * 0.38);
  const h = w * (289 / 1122);
  return (
    <g aria-hidden pointerEvents="none">
      <image href="/chartix-wordmark.png" x={(x0 + x1) / 2 - w / 2} y={(y0 + y1) / 2 - h / 2} width={w} height={h} opacity={0.07} preserveAspectRatio="xMidYMid meet" />
      <text x={width - 4} y={10} textAnchor="end" fontSize={10} fontWeight={500} letterSpacing={0.3} fill="#A8A29E">chartix.in</text>
    </g>
  );
}

// ── geometry ──
const W = 760;
const PAD = { l: 48, r: 14, t: 14, b: 30 };

/** Vertical bar path, rounded only at the data end (away from the baseline). */
function barPath(x: number, w: number, y0: number, y1: number, r = 3) {
  const h = Math.abs(y1 - y0);
  const rr = Math.min(r, w / 2, h);
  if (h < 0.5) return '';
  if (y1 < y0) { // positive bar, rounded top
    return `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 + rr}V${y0}Z`;
  }
  return `M${x},${y0}V${y1 - rr}Q${x},${y1} ${x + rr},${y1}H${x + w - rr}Q${x + w},${y1} ${x + w},${y1 - rr}V${y0}Z`;
}

function useHover(n: number, innerW: number) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - PAD.l;
    setI(Math.max(0, Math.min(n - 1, Math.floor((x / innerW) * n))));
  };
  return { ref, i, onMove, onLeave: () => setI(null) };
}

function Tip({ show, xPct, children }: { show: boolean; xPct: number; children: ReactNode }) {
  if (!show) return null;
  const left = xPct > 60;
  return (
    <div className="pointer-events-none absolute top-2 z-10 min-w-[180px] rounded-xl border border-stone-200 bg-white/95 px-3.5 py-3 text-[12.5px] shadow-[0_4px_20px_rgba(28,25,23,0.08)] backdrop-blur"
      style={left ? { right: `${100 - xPct + 2}%` } : { left: `${xPct + 2}%` }}>
      {children}
    </div>
  );
}

function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="mt-1.5 flex items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-stone-500">
        {color && <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: color }} />}{label}
      </span>
      <span className="font-mono tabular-nums text-stone-900">{value}</span>
    </div>
  );
}

function YAxis({ ticks, y, fmt, innerW }: { ticks: number[]; y: (v: number) => number; fmt: (v: number) => string; innerW: number }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={PAD.l + innerW} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#D6D3CD' : COLORS.grid} strokeWidth={1} />
          <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10.5} fill={COLORS.axis}>{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
}

function XLabels({ labels, x, H }: { labels: { i: number; text: string }[]; x: (i: number) => number; H: number }) {
  return (
    <g>
      {labels.map(({ i, text }) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill={COLORS.axis}>{text}</text>
      ))}
    </g>
  );
}

function spread(n: number, want = 5) {
  if (n <= want) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: want }, (_, k) => Math.round((k * (n - 1)) / (want - 1)));
}

// ── Paired bars (FII vs DII) — daily, weekly or monthly ──
type Pair = { key: string; label: string; tipTitle: string; fii: number; dii: number; sessions?: number };

function PairedBars({ data, height = 300 }: { data: Pair[]; height?: number }) {
  const H = height;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const vals = data.flatMap((d) => [d.fii, d.dii]);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const y = (v: number) => PAD.t + innerH - ((v - lo) / (hi - lo)) * innerH;
  const band = innerW / Math.max(1, data.length);
  const group = band * (data.length > 40 ? 0.82 : 0.7);
  const bw = Math.max(1, (group - 2) / 2);
  const x0 = (i: number) => PAD.l + i * band + (band - group) / 2;
  const { ref, i, onMove, onLeave } = useHover(data.length, innerW);
  const hov = i != null ? data[i] : null;
  const labels = spread(data.length, data.length <= 12 ? data.length : 5).map((k) => ({ i: k, text: data[k].label }));

  return (
    <ChartScroll><div className="relative min-w-[600px]">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={onLeave} role="img"
        aria-label="FII and DII net flows">
        <YAxis ticks={ticks} y={y} fmt={axisCr} innerW={innerW} />
        <ChartMark x0={PAD.l} x1={PAD.l + innerW} y0={PAD.t} y1={PAD.t + innerH} width={W} />
        {i != null && <rect x={PAD.l + i * band} y={PAD.t} width={band} height={innerH} fill="#F5F4F0" />}
        {data.map((d, k) => (
          <g key={d.key} opacity={i == null || i === k ? 1 : 0.55}>
            <path d={barPath(x0(k), bw, y(0), y(d.fii))} fill={COLORS.fii} />
            <path d={barPath(x0(k) + bw + 2, bw, y(0), y(d.dii))} fill={COLORS.dii} />
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l + innerW} y1={y(0)} y2={y(0)} stroke="#A8A29E" strokeWidth={1} />
        <XLabels labels={labels} x={(k) => PAD.l + k * band + band / 2} H={H} />
      </svg>
      <Tip show={!!hov} xPct={i == null ? 0 : ((PAD.l + (i + 0.5) * band) / W) * 100}>
        {hov && <>
          <p className="font-medium text-stone-900">{hov.tipTitle}</p>
          <TipRow color={COLORS.fii} label="FII net" value={cr(hov.fii)} />
          <TipRow color={COLORS.dii} label="DII net" value={cr(hov.dii)} />
          <div className="mt-2 border-t border-stone-100 pt-1">
            <TipRow label="Combined" value={cr(hov.fii + hov.dii)} />
          </div>
          {hov.sessions != null && hov.sessions > 1 && <p className="mt-1.5 text-[11.5px] text-stone-400">{hov.sessions} sessions</p>}
        </>}
      </Tip>
    </div></ChartScroll>
  );
}

function Legend({ extra }: { extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Swatch color={COLORS.fii} label="FII / FPI" />
      <Swatch color={COLORS.dii} label="DII" />
      {extra}
    </div>
  );
}

function weekStart(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

type Range = '1M' | '3M' | '6M' | 'ALL';

export function DailyFlowChart({ rows }: { rows: CashDay[] }) {
  const [range, setRange] = useState<Range>('3M');
  const data = useMemo<Pair[]>(() => {
    if (range === 'ALL') {
      const weeks = new Map<string, Pair>();
      for (const r of rows) {
        const k = weekStart(r.date);
        const w = weeks.get(k) ?? { key: k, label: fmtDate(k, 'day'), tipTitle: `Week of ${fmtDate(k, 'day')}`, fii: 0, dii: 0, sessions: 0 };
        w.fii += r.fiiNet; w.dii += r.diiNet; w.sessions = (w.sessions ?? 0) + 1;
        weeks.set(k, w);
      }
      return [...weeks.values()];
    }
    return lastDays(rows, range === '1M' ? 31 : range === '3M' ? 92 : 183).map((r) => ({ key: r.date, label: fmtDate(r.date, 'day'), tipTitle: fmtDate(r.date, 'long'), fii: r.fiiNet, dii: r.diiNet }));
  }, [rows, range]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Legend extra={range === 'ALL' ? <span className="text-[12.5px] text-stone-400">Weekly totals</span> : <span className="text-[12.5px] text-stone-400">Daily net, ₹ Cr</span>} />
        <Segmented value={range} onChange={setRange} options={[['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['ALL', 'All']]} />
      </div>
      <PairedBars data={data} />
    </div>
  );
}

export function MonthlyChart({ months }: { months: MonthTotal[] }) {
  const data: Pair[] = months.map((m) => ({ key: m.key, label: fmtMonth(m.key).split(' ')[0], tipTitle: fmtMonth(m.key, true), fii: m.fii, dii: m.dii, sessions: m.sessions }));
  return (
    <div>
      <div className="mb-5"><Legend extra={<span className="text-[12.5px] text-stone-400">Monthly net, ₹ Cr</span>} /></div>
      <PairedBars data={data} height={280} />
    </div>
  );
}

// ── Cumulative flow lines ──
export function CumulativeChart({ rows }: { rows: CashDay[] }) {
  const H = 300;
  const innerW = W - PAD.l - PAD.r - 104; // room for end labels
  const innerH = H - PAD.t - PAD.b;
  const series = useMemo(() => {
    let f = 0, d = 0;
    return rows.map((r) => { f += r.fiiNet; d += r.diiNet; return { date: r.date, fii: f, dii: d }; });
  }, [rows]);
  const vals = series.flatMap((s) => [s.fii, s.dii]);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const n = series.length;
  const x = (k: number) => PAD.l + (n <= 1 ? 0 : (k / (n - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = (k: 'fii' | 'dii') => series.map((s, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(s[k]).toFixed(1)}`).join('');
  const { ref, i, onMove, onLeave } = useHover(n, innerW);
  const hov = i != null ? series[i] : null;
  const last = series[n - 1];
  const labels = spread(n).map((k) => ({ i: k, text: fmtDate(series[k].date, 'day') }));

  if (!last) return null;
  return (
    <div>
      <div className="mb-5"><Legend extra={<span className="text-[12.5px] text-stone-400">Running total since {fmtDate(series[0].date)} · L = lakh crore</span>} /></div>
      <ChartScroll><div className="relative min-w-[600px]">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={onLeave} role="img"
          aria-label="Cumulative FII and DII net flows">
          <YAxis ticks={ticks} y={y} fmt={axisCr} innerW={innerW} />
          <ChartMark x0={PAD.l} x1={PAD.l + innerW} y0={PAD.t} y1={PAD.t + innerH} width={W} />
          <path d={`${line('dii')}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={COLORS.dii} opacity={0.07} />
          <path d={`${line('fii')}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={COLORS.fii} opacity={0.07} />
          <path d={line('dii')} fill="none" stroke={COLORS.dii} strokeWidth={2} strokeLinejoin="round" />
          <path d={line('fii')} fill="none" stroke={COLORS.fii} strokeWidth={2} strokeLinejoin="round" />
          <line x1={PAD.l} x2={PAD.l + innerW} y1={y(0)} y2={y(0)} stroke="#A8A29E" strokeWidth={1} />
          {(['dii', 'fii'] as const).map((k) => (
            <g key={k}>
              <circle cx={x(n - 1)} cy={y(last[k])} r={4} fill={COLORS[k]} stroke="#fff" strokeWidth={2} />
              <text x={x(n - 1) + 9} y={y(last[k]) - 3} fontSize={11} fontWeight={600} fill={COLORS.ink}>{k === 'fii' ? 'FII' : 'DII'}</text>
              <text x={x(n - 1) + 9} y={y(last[k]) + 10} fontSize={10.5} fill="#57534E">{cr(last[k])}</text>
            </g>
          ))}
          {hov && i != null && <>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={PAD.t + innerH} stroke="#D6D3CD" strokeWidth={1} />
            <circle cx={x(i)} cy={y(hov.fii)} r={4} fill={COLORS.fii} stroke="#fff" strokeWidth={2} />
            <circle cx={x(i)} cy={y(hov.dii)} r={4} fill={COLORS.dii} stroke="#fff" strokeWidth={2} />
          </>}
          <XLabels labels={labels} x={x} H={H} />
        </svg>
        <Tip show={!!hov} xPct={i == null ? 0 : (x(i) / W) * 100}>
          {hov && <>
            <p className="font-medium text-stone-900">{fmtDate(hov.date)}</p>
            <TipRow color={COLORS.fii} label="FII total" value={cr(hov.fii)} />
            <TipRow color={COLORS.dii} label="DII total" value={cr(hov.dii)} />
          </>}
        </Tip>
      </div></ChartScroll>
    </div>
  );
}

// ── F&O: share of FII index-futures held long ──
export function LongShareChart({ days }: { days: FnoDay[] }) {
  const [range, setRange] = useState<'3M' | 'ALL'>('ALL');
  const data = range === '3M' ? lastDays(days, 92) : days;
  const H = 280;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const pts = data.map((d) => ({ date: d.date, pct: longShare(d.fii.idxFut), p: d.fii.idxFut }));
  const maxPct = Math.max(60, ...pts.map((p) => p.pct));
  const ticks = niceTicks(0, maxPct, 4).filter((t) => t <= 100);
  const hi = ticks[ticks.length - 1];
  const n = pts.length;
  const x = (k: number) => PAD.l + (n <= 1 ? 0 : (k / (n - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / hi) * innerH;
  const path = pts.map((p, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(p.pct).toFixed(1)}`).join('');
  const { ref, i, onMove, onLeave } = useHover(n, innerW);
  const hov = i != null ? pts[i] : null;
  const labels = spread(n).map((k) => ({ i: k, text: fmtDate(pts[k].date, 'day') }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[12.5px] text-stone-400">% of FII index-futures contracts held long</span>
        <Segmented value={range} onChange={setRange} options={[['3M', '3M'], ['ALL', 'All']]} />
      </div>
      <ChartScroll><div className="relative min-w-[600px]">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={onLeave} role="img"
          aria-label="Share of FII index futures held long">
          <YAxis ticks={ticks} y={y} fmt={(v) => `${v}%`} innerW={innerW} />
          <ChartMark x0={PAD.l} x1={PAD.l + innerW} y0={PAD.t} y1={PAD.t + innerH} width={W} />
          {hi >= 50 && <>
            <line x1={PAD.l} x2={PAD.l + innerW} y1={y(50)} y2={y(50)} stroke="#A8A29E" strokeDasharray="4 4" />
            <text x={PAD.l + innerW} y={y(50) - 6} textAnchor="end" fontSize={10.5} fill="#78716C">50% = balanced</text>
          </>}
          <path d={`${path}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={COLORS.fii} opacity={0.07} />
          <path d={path} fill="none" stroke={COLORS.fii} strokeWidth={2} strokeLinejoin="round" />
          {hov && i != null && <>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={PAD.t + innerH} stroke="#D6D3CD" />
            <circle cx={x(i)} cy={y(hov.pct)} r={4} fill={COLORS.fii} stroke="#fff" strokeWidth={2} />
          </>}
          <XLabels labels={labels} x={x} H={H} />
        </svg>
        <Tip show={!!hov} xPct={i == null ? 0 : (x(i) / W) * 100}>
          {hov && <>
            <p className="font-medium text-stone-900">{fmtDate(hov.date)}</p>
            <TipRow color={COLORS.fii} label="Held long" value={`${hov.pct.toFixed(1)}%`} />
            <TipRow label="Long contracts" value={num(hov.p.long)} />
            <TipRow label="Short contracts" value={num(hov.p.short)} />
          </>}
        </Tip>
      </div></ChartScroll>
    </div>
  );
}

// ── F&O: net contracts over time, one small chart per position ──
type NetPt = { date: string; net: number; long: number; short: number };
type Pick = (d: FnoDay) => { long: number; short: number };

const SW = 440;
const SPAD = { l: 44, r: 10, t: 12, b: 26 };

function NetLine({ pts, color, height = 210 }: { pts: NetPt[]; color: string; height?: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [i, setI] = useState<number | null>(null);
  const H = height;
  const innerW = SW - SPAD.l - SPAD.r;
  const innerH = H - SPAD.t - SPAD.b;
  const n = pts.length;
  const vals = pts.map((p) => p.net);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 3);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (k: number) => SPAD.l + (n <= 1 ? 0 : (k / (n - 1)) * innerW);
  const y = (v: number) => SPAD.t + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = pts.map((p, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(p.net).toFixed(1)}`).join('');
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg || n === 0) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * SW - SPAD.l;
    setI(Math.max(0, Math.min(n - 1, Math.round((px / innerW) * (n - 1)))));
  };
  const hov = i != null ? pts[i] : null;
  const labels = spread(n, 3).map((k) => ({ k, text: fmtDate(pts[k].date, 'day') }));
  if (!n) return null;

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${SW} ${H}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setI(null)} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={SPAD.l} x2={SPAD.l + innerW} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#A8A29E' : COLORS.grid} />
            <text x={SPAD.l - 7} y={y(t) + 3.5} textAnchor="end" fontSize={11} fill={COLORS.axis}>{axisCr(t)}</text>
          </g>
        ))}
        <ChartMark x0={SPAD.l} x1={SPAD.l + innerW} y0={SPAD.t} y1={SPAD.t + innerH} width={SW} />
        <path d={`${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={color} opacity={0.08} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={x(n - 1)} cy={y(pts[n - 1].net)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
        {hov && i != null && <>
          <line x1={x(i)} x2={x(i)} y1={SPAD.t} y2={SPAD.t + innerH} stroke="#D6D3CD" />
          <circle cx={x(i)} cy={y(hov.net)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
        </>}
        {labels.map(({ k, text }) => (
          <text key={k} x={x(k)} y={H - 7} textAnchor={k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle'} fontSize={11} fill={COLORS.axis}>{text}</text>
        ))}
      </svg>
      <Tip show={!!hov} xPct={i == null ? 0 : (x(i) / SW) * 100}>
        {hov && <>
          <p className="font-medium text-stone-900">{fmtDate(hov.date)}</p>
          <TipRow color={color} label="Net" value={num(hov.net, true)} />
          <TipRow label="Long" value={num(hov.long)} />
          <TipRow label="Short" value={num(hov.short)} />
        </>}
      </Tip>
    </div>
  );
}

const POSITIONS: { key: string; title: string; who: 'fii' | 'dii'; pick: Pick; hint: string }[] = [
  { key: 'fii-idx-fut', title: 'FII index futures', who: 'fii', pick: (d) => d.fii.idxFut, hint: 'Below zero = net short the index' },
  { key: 'fii-idx-call', title: 'FII index calls', who: 'fii', pick: (d) => d.fii.idxCall, hint: 'Below zero = net call writers' },
  { key: 'fii-idx-put', title: 'FII index puts', who: 'fii', pick: (d) => d.fii.idxPut, hint: 'Above zero = net put buyers (protection)' },
  { key: 'fii-stk-fut', title: 'FII stock futures', who: 'fii', pick: (d) => d.fii.stkFut, hint: 'Single-stock futures, often paired with cash holdings' },
  { key: 'dii-idx-fut', title: 'DII index futures', who: 'dii', pick: (d) => d.dii.idxFut, hint: 'Mostly hedging by domestic funds' },
  { key: 'dii-stk-fut', title: 'DII stock futures', who: 'dii', pick: (d) => d.dii.stkFut, hint: 'Largely hedges and arbitrage — a big short is normal' },
];

export function FnoTrends({ days }: { days: FnoDay[] }) {
  const [range, setRange] = useState<'1M' | '3M' | 'ALL'>('3M');
  const data = range === '1M' ? lastDays(days, 31) : range === '3M' ? lastDays(days, 92) : days;
  if (!data.length) return null;
  const first = data[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-stone-500">Net contracts (long minus short) · since {fmtDate(first.date)} · L = lakh, k = thousand</p>
        <Segmented value={range} onChange={setRange} options={[['1M', '1M'], ['3M', '3M'], ['ALL', 'All']]} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {POSITIONS.map((p) => {
          const pts = data.map((d) => { const v = p.pick(d); return { date: d.date, net: v.long - v.short, long: v.long, short: v.short }; });
          const last = pts[pts.length - 1];
          const change = last.net - pts[0].net;
          return (
            <div key={p.key} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-stone-900">
                    <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ backgroundColor: COLORS[p.who] }} />{p.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-stone-500">{p.hint}</p>
                </div>
                <div className="flex-none text-right">
                  <p className="font-mono text-[15px] tabular-nums text-stone-900">{num(last.net, true)}</p>
                  <p className="mt-0.5 text-[12px] text-stone-500">{num(change, true)} in period</p>
                </div>
              </div>
              <div className="mt-4"><NetLine pts={pts} color={COLORS[p.who]} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
