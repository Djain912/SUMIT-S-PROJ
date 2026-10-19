// Market Desk card renderer — one self-contained 1600×900 (16:9) SVG per post.
// Editorial look: warm paper background, serif headline, quiet grid, a single
// accent colour, and a consistent footer so the feed is recognisable at a glance.
//
// Fonts: StudioSerif (Instrument Serif) + StudioSans (Manrope) are served from
// /fonts/studio and declared on the Studio page. The PNG exporter inlines them.

import type { Unit } from './fetch-market-data';
import { fmtAxis, fmtPct, fmtValue } from './stats';

export const X_HANDLE = '@Sumit_jain01';

const W = 1600;
const H = 900;
const M = 88; // outer margin

const BG = '#FAF8F3';
const INK = '#14161A';
const MUTED = '#5B616B';
const FAINT = '#8C919A';
const RULE = '#E2DDD2';
const GRID = '#ECE8DF';
const ACCENT = '#0B5D3B';
const POS = '#1F7A4D';
const NEG = '#B3412F';

export const SERIF = "StudioSerif, 'Instrument Serif', Georgia, 'Times New Roman', serif";
export const SANS = "StudioSans, Manrope, 'Helvetica Neue', Arial, sans-serif";

export type LineChart = {
  kind: 'line';
  dates: string[];
  values: number[];
  unit: Unit;
  overlay?: { values: number[]; label: string };          // e.g. 200-day average
  refLines?: { value: number; label: string }[];          // e.g. 10-year average
  highlight?: { from: number; to: number };               // shaded index range
  markers?: { idx: number; label: string }[];             // annotated points
};

export type BarChart = {
  kind: 'bars';
  items: { label: string; value: number }[];
  format: 'pct' | 'crore' | 'share';
  avg?: { value: number; label: string };
  emphasizeLast?: boolean;
};

export type HBarChart = {
  kind: 'hbars';
  items: { label: string; value: number }[];
  format: 'pct' | 'share';  // share: 0–100 readings, coloured by above/below 50
  caption?: string;
};

export type ChartSpec = LineChart | BarChart | HBarChart;

export type CardSpec = {
  kicker: string;                              // e.g. "Streak · Nifty 50"
  headline: string;
  subtitle: string;
  keyStat?: { value: string; label: string };
  chart: ChartSpec;
  source: string;
  asOf: string;                                // "17 Oct 2026"
};

// ── text helpers ────────────────────────────────────────────────────────────

function esc(s: string | number) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Rough advance widths (em) — good enough to wrap without a layout engine.
const SERIF_EM = 0.32; // Instrument Serif is narrow
const SANS_EM = 0.5;

function textWidth(s: string, size: number, em: number) {
  return s.length * size * em;
}

function wrap(text: string, maxWidth: number, size: number, em: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size, em) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmtBarValue(v: number, format: 'pct' | 'crore' | 'share') {
  if (format === 'pct') return fmtPct(v, 1);
  if (format === 'share') return `${v.toFixed(0)}%`;
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(1)}K` : a.toFixed(0);
  return `${v < 0 ? '−' : v > 0 ? '+' : ''}₹${s} cr`;
}

function niceStep(range: number, count: number) {
  const raw = range / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Wrap, then narrow the width while the line count holds, so lines come out even (no orphans). */
function balancedWrap(text: string, maxWidth: number, size: number, em: number): string[] {
  const lines = wrap(text, maxWidth, size, em);
  if (lines.length < 2) return lines;
  let best = lines;
  for (let w = maxWidth - 20; w > maxWidth * 0.55; w -= 20) {
    const next = wrap(text, w, size, em);
    if (next.length !== lines.length) break;
    best = next;
  }
  return best;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── charts ──────────────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number };

function lineChart(c: LineChart, box: Box): string {
  const { values, dates } = c;
  const n = values.length;
  const plotW = box.w - 110; // room for right-hand axis labels + value badge
  const x0 = box.x;
  const y0 = box.y;
  const h = box.h - 34; // room for x labels

  const pool = [...values, ...(c.overlay?.values.filter(Number.isFinite) ?? []), ...(c.refLines?.map((r) => r.value) ?? [])];
  const minV = Math.min(...pool);
  const maxV = Math.max(...pool);
  const span = maxV - minV || Math.abs(maxV) * 0.05 || 1;
  // Round tick values (1, 2, 2.5, 5 × 10ⁿ) read far better than arbitrary ones.
  const step = niceStep(span * 1.12, 4);
  let lo = Math.floor((minV - span * 0.04) / step) * step;
  let hi = Math.ceil((maxV + span * 0.08) / step) * step;
  if (c.unit === 'pct') { lo = Math.max(lo, 0); hi = Math.min(hi, 100); } // shares live in 0–100
  if (c.unit === 'count') lo = Math.max(lo, 0);

  const X = (i: number) => x0 + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const Y = (v: number) => y0 + h - ((v - lo) / (hi - lo)) * h;

  const parts: string[] = [];

  // grid + right axis labels (skipping any the last-value badge would cover)
  const badgeY = Y(values[n - 1]);
  for (let v = lo; v <= hi + step / 2; v += step) {
    const yy = Y(v);
    parts.push(`<line x1="${x0}" y1="${yy.toFixed(1)}" x2="${x0 + plotW}" y2="${yy.toFixed(1)}" stroke="${GRID}" stroke-width="1.5"/>`);
    if (Math.abs(yy - badgeY) < 26) continue;
    parts.push(`<text x="${x0 + plotW + 14}" y="${(yy + 6).toFixed(1)}" font-family="${SANS}" font-size="17" fill="${FAINT}" style="font-variant-numeric:tabular-nums">${esc(fmtAxis(v, c.unit, step))}</text>`);
  }

  // x ticks: years when the window is long, months otherwise
  const spanDays = (Date.parse(dates[n - 1]) - Date.parse(dates[0])) / 86400_000;
  const ticks: { i: number; label: string }[] = [];
  if (spanDays > 3 * 365) {
    const years = Math.ceil(spanDays / 365);
    const every = years > 12 ? 3 : years > 6 ? 2 : 1;
    for (let i = 1; i < n; i++) {
      const yr = Number(dates[i].slice(0, 4));
      if (dates[i].slice(0, 4) !== dates[i - 1].slice(0, 4) && yr % every === 0) ticks.push({ i, label: String(yr) });
    }
  } else {
    const months = spanDays / 30.4;
    const every = months > 18 ? 3 : months > 8 ? 2 : 1;
    for (let i = 1; i < n; i++) {
      if (dates[i].slice(5, 7) !== dates[i - 1].slice(5, 7)) {
        const m = Number(dates[i].slice(5, 7)) - 1;
        if (m % every !== 0) continue;
        ticks.push({ i, label: m === 0 ? dates[i].slice(0, 4) : MONTHS[m] });
      }
    }
  }
  for (const t of ticks) {
    const xx = X(t.i);
    if (xx < x0 + 30 || xx > x0 + plotW - 30) continue;
    parts.push(`<text x="${xx.toFixed(1)}" y="${y0 + h + 30}" text-anchor="middle" font-family="${SANS}" font-size="17" fill="${FAINT}">${esc(t.label)}</text>`);
  }

  // highlight band
  if (c.highlight) {
    const a = X(Math.max(0, c.highlight.from));
    const b = X(Math.min(n - 1, c.highlight.to));
    parts.push(`<rect x="${(a - 4).toFixed(1)}" y="${y0}" width="${Math.max(8, b - a + 8).toFixed(1)}" height="${h}" fill="${ACCENT}" fill-opacity="0.07"/>`);
  }

  // reference lines
  for (const r of c.refLines ?? []) {
    const yy = Y(r.value);
    parts.push(`<line x1="${x0}" y1="${yy.toFixed(1)}" x2="${x0 + plotW}" y2="${yy.toFixed(1)}" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="7 7"/>`);
    parts.push(`<text x="${x0 + 6}" y="${(yy - 10).toFixed(1)}" font-family="${SANS}" font-size="17" font-weight="600" fill="${MUTED}">${esc(r.label)}</text>`);
  }

  // overlay (e.g. moving average)
  if (c.overlay) {
    const pts: string[] = [];
    c.overlay.values.forEach((v, i) => { if (Number.isFinite(v)) pts.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`); });
    if (pts.length > 1) {
      parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${FAINT}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`);
      // Label the overlay away from the right edge, where markers and the badge live.
      let li = Math.round((n - 1) * 0.72);
      while (li > 0 && !Number.isFinite(c.overlay.values[li])) li++;
      const oy = Y(c.overlay.values[li]);
      const below = oy > Y(values[li]);
      parts.push(`<text x="${X(li).toFixed(1)}" y="${(oy + (below ? 26 : -12)).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="16" font-weight="600" fill="${FAINT}" stroke="${BG}" stroke-width="6" stroke-linejoin="round" paint-order="stroke">${esc(c.overlay.label)}</text>`);
    }
  }

  // area + line
  const linePts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  parts.push(`<polygon points="${X(0).toFixed(1)},${y0 + h} ${linePts} ${X(n - 1).toFixed(1)},${y0 + h}" fill="url(#area)"/>`);
  parts.push(`<polyline points="${linePts}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`);

  // markers
  for (const mk of c.markers ?? []) {
    if (mk.idx < 0 || mk.idx >= n) continue;
    const mx = X(mk.idx);
    const my = Y(values[mk.idx]);
    const halo = `stroke="${BG}" stroke-width="7" stroke-linejoin="round" paint-order="stroke"`;
    if (my - y0 > 56) {
      const ty = my - 30;
      const anchor = mx > x0 + plotW - 160 ? 'end' : mx < x0 + 160 ? 'start' : 'middle';
      parts.push(`<line x1="${mx.toFixed(1)}" y1="${(my - 8).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(ty + 8).toFixed(1)}" stroke="${ACCENT}" stroke-width="1.5"/>`);
      parts.push(`<text x="${mx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-family="${SANS}" font-size="18" font-weight="700" fill="${ACCENT}" ${halo}>${esc(mk.label)}</text>`);
    } else {
      const right = mx < x0 + plotW - 220;
      parts.push(`<text x="${(mx + (right ? 16 : -16)).toFixed(1)}" y="${(my + 6).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" font-family="${SANS}" font-size="18" font-weight="700" fill="${ACCENT}" ${halo}>${esc(mk.label)}</text>`);
    }
    parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="6" fill="${BG}" stroke="${ACCENT}" stroke-width="2.5"/>`);
  }

  // last value badge on the axis
  const lx = X(n - 1);
  const ly = Y(values[n - 1]);
  const label = fmtValue(values[n - 1], c.unit);
  const bw = Math.max(70, textWidth(label, 17, 0.6) + 22);
  parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="6" fill="${ACCENT}"/>`);
  parts.push(`<rect x="${x0 + plotW + 6}" y="${(ly - 16).toFixed(1)}" width="${bw.toFixed(0)}" height="32" rx="6" fill="${ACCENT}"/>`);
  parts.push(`<text x="${(x0 + plotW + 6 + bw / 2).toFixed(1)}" y="${(ly + 6).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="700" fill="#fff" style="font-variant-numeric:tabular-nums">${esc(label)}</text>`);

  return parts.join('\n');
}

function barChart(c: BarChart, box: Box): string {
  const items = c.items;
  const n = items.length;
  const parts: string[] = [];
  const labelH = 34;
  const valueH = n <= 16 ? 30 : 0;
  const top = box.y + valueH;
  const h = box.h - labelH - valueH * 2;
  const vals = items.map((i) => i.value).concat(c.avg ? [c.avg.value] : []);
  const maxV = Math.max(0, ...vals);
  const minV = Math.min(0, ...vals);
  const span = maxV - minV || 1;
  const Y = (v: number) => top + ((maxV - v) / span) * h;
  const slot = box.w / n;
  const bw = Math.min(64, slot * 0.62);
  const zeroY = Y(0);

  parts.push(`<line x1="${box.x}" y1="${zeroY.toFixed(1)}" x2="${box.x + box.w}" y2="${zeroY.toFixed(1)}" stroke="${MUTED}" stroke-width="1.5"/>`);

  items.forEach((it, i) => {
    const cx = box.x + slot * i + slot / 2;
    const yv = Y(it.value);
    const y = Math.min(yv, zeroY);
    const bh = Math.max(2, Math.abs(zeroY - yv));
    const isLast = c.emphasizeLast && i === n - 1;
    const fill = it.value >= 0 ? POS : NEG;
    parts.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${fill}" fill-opacity="${isLast || !c.emphasizeLast ? 0.92 : 0.45}"/>`);
    if (valueH) {
      const vy = it.value >= 0 ? y - 10 : y + bh + 24;
      parts.push(`<text x="${cx.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="16" font-weight="700" fill="${it.value >= 0 ? POS : NEG}" style="font-variant-numeric:tabular-nums">${esc(fmtBarValue(it.value, c.format))}</text>`);
    }
    const showLabel = n <= 16 || i % Math.ceil(n / 12) === 0 || i === n - 1;
    if (showLabel) {
      parts.push(`<text x="${cx.toFixed(1)}" y="${(box.y + box.h - 4).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="16" fill="${isLast ? INK : FAINT}" font-weight="${isLast ? 700 : 500}">${esc(it.label)}</text>`);
    }
  });

  if (c.avg) {
    const ay = Y(c.avg.value);
    parts.push(`<line x1="${box.x}" y1="${ay.toFixed(1)}" x2="${box.x + box.w}" y2="${ay.toFixed(1)}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="7 7"/>`);
    parts.push(`<text x="${box.x + box.w}" y="${(ay - 10).toFixed(1)}" text-anchor="end" font-family="${SANS}" font-size="17" font-weight="700" fill="${INK}">${esc(c.avg.label)}</text>`);
  }
  return parts.join('\n');
}

function hbarChart(c: HBarChart, box: Box): string {
  const items = c.items;
  const n = items.length;
  const parts: string[] = [];
  const labelW = 230;
  const valueW = 110;
  const rowH = Math.min(46, box.h / n);
  const barH = Math.min(26, rowH * 0.6);
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 0.0001);
  const hasNeg = items.some((i) => i.value < 0);
  const hasPos = items.some((i) => i.value > 0);
  const plotX = box.x + labelW;
  const plotW = box.w - labelW - valueW;
  const zeroX = hasNeg && hasPos ? plotX + plotW * (Math.max(...items.map((i) => -i.value), 0) / (Math.max(...items.map((i) => -i.value), 0) + Math.max(...items.map((i) => i.value), 0))) : hasNeg ? plotX + plotW : plotX;
  const scale = hasNeg && hasPos ? plotW / (Math.max(...items.map((i) => -i.value), 0) + Math.max(...items.map((i) => i.value), 0)) : plotW / maxAbs;

  parts.push(`<line x1="${zeroX.toFixed(1)}" y1="${box.y - 6}" x2="${zeroX.toFixed(1)}" y2="${(box.y + rowH * n).toFixed(1)}" stroke="${MUTED}" stroke-width="1.5"/>`);
  items.forEach((it, i) => {
    const cy = box.y + rowH * i + rowH / 2;
    const len = Math.max(3, Math.abs(it.value) * scale);
    const x = it.value >= 0 ? zeroX : zeroX - len;
    const fill = c.format === 'share' ? (it.value >= 50 ? POS : NEG) : it.value >= 0 ? POS : NEG;
    parts.push(`<text x="${box.x}" y="${(cy + 7).toFixed(1)}" font-family="${SANS}" font-size="20" font-weight="600" fill="${INK}">${esc(it.label)}</text>`);
    parts.push(`<rect x="${x.toFixed(1)}" y="${(cy - barH / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" fill="${fill}" fill-opacity="0.9"/>`);
    const vx = it.value >= 0 ? x + len + 12 : x - 12;
    parts.push(`<text x="${vx.toFixed(1)}" y="${(cy + 7).toFixed(1)}" text-anchor="${it.value >= 0 ? 'start' : 'end'}" font-family="${SANS}" font-size="19" font-weight="700" fill="${fill}" style="font-variant-numeric:tabular-nums">${esc(fmtBarValue(it.value, c.format))}</text>`);
  });
  if (c.caption) {
    parts.push(`<text x="${box.x + box.w}" y="${(box.y + rowH * n + 30).toFixed(1)}" text-anchor="end" font-family="${SANS}" font-size="16" fill="${FAINT}">${esc(c.caption)}</text>`);
  }
  return parts.join('\n');
}

// ── card ────────────────────────────────────────────────────────────────────

export function renderCard(spec: CardSpec): string {
  const parts: string[] = [];
  const hasStat = !!spec.keyStat;
  const textW = hasStat ? 1010 : W - 2 * M;

  // kicker
  parts.push(`<rect x="${M}" y="74" width="28" height="4" fill="${ACCENT}"/>`);
  parts.push(`<text x="${M + 40}" y="82" font-family="${SANS}" font-size="19" font-weight="700" letter-spacing="2.6" fill="${ACCENT}">${esc(spec.kicker.toUpperCase())}</text>`);

  // headline — shrink until it fits in two lines
  let size = 60;
  let lines = balancedWrap(spec.headline, textW, size, SERIF_EM);
  while (lines.length > 2 && size > 44) {
    size -= 4;
    lines = balancedWrap(spec.headline, textW, size, SERIF_EM);
  }
  lines = lines.slice(0, 3);
  const lh = Math.round(size * 1.1);
  let y = 112 + size * 0.82;
  for (const l of lines) {
    parts.push(`<text x="${M}" y="${y.toFixed(0)}" font-family="${SERIF}" font-size="${size}" fill="${INK}" letter-spacing="-0.5">${esc(l)}</text>`);
    y += lh;
  }

  // subtitle
  const sub = wrap(spec.subtitle, textW, 23, SANS_EM).slice(0, 2);
  y += 2;
  for (const l of sub) {
    parts.push(`<text x="${M}" y="${y.toFixed(0)}" font-family="${SANS}" font-size="23" fill="${MUTED}">${esc(l)}</text>`);
    y += 33;
  }

  // key stat
  if (spec.keyStat) {
    const kx = W - M - 330;
    parts.push(`<rect x="${kx}" y="108" width="3" height="160" fill="${ACCENT}"/>`);
    let vs = 92;
    // Generous width estimate: ₹, %, K and digits run wider than average text.
    while (textWidth(spec.keyStat.value, vs, 0.5) > 290 && vs > 48) vs -= 6;
    parts.push(`<text x="${kx + 28}" y="${108 + vs * 0.86}" font-family="${SERIF}" font-size="${vs}" fill="${ACCENT}" style="font-variant-numeric:tabular-nums">${esc(spec.keyStat.value)}</text>`);
    const kl = wrap(spec.keyStat.label, 300, 19, SANS_EM).slice(0, 3);
    let ky = 108 + vs * 0.86 + 38;
    for (const l of kl) {
      parts.push(`<text x="${kx + 28}" y="${ky.toFixed(0)}" font-family="${SANS}" font-size="19" font-weight="600" fill="${MUTED}">${esc(l)}</text>`);
      ky += 26;
    }
  }

  // chart
  const chartTop = Math.max(y + 34, hasStat ? 330 : 300);
  const box: Box = { x: M, y: chartTop, w: W - 2 * M, h: 800 - chartTop };
  if (spec.chart.kind === 'line') parts.push(lineChart(spec.chart, box));
  else if (spec.chart.kind === 'bars') parts.push(barChart(spec.chart, box));
  else parts.push(hbarChart(spec.chart, { ...box, x: M + 40, w: box.w - 80 }));

  // footer
  parts.push(`<line x1="${M}" y1="826" x2="${W - M}" y2="826" stroke="${RULE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M}" y="864" font-family="${SANS}" font-size="18" fill="${FAINT}">${esc(`Source: ${spec.source}  ·  Data to ${spec.asOf}`)}</text>`);
  const tail = `chartix.in  ·  ${X_HANDLE}`;
  parts.push(`<text x="${W - M}" y="864" text-anchor="end" font-family="${SANS}" font-size="18" font-weight="600" fill="${MUTED}">${esc(tail)}</text>`);
  parts.push(`<text x="${(W - M - textWidth(tail, 18, SANS_EM) - 18).toFixed(0)}" y="866" text-anchor="end" font-family="${SERIF}" font-size="32" fill="${INK}">Chartix</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.10"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="${BG}"/>
${parts.join('\n')}
</svg>`;
}
