// Generates self-contained SVG charts in the @Patterns0001 dark style.
// All output is an SVG string — no external dependencies.

const BG = '#0d0d0d';
const ACCENT = '#F59E0B';  // amber/gold
const ACCENT2 = '#EF4444'; // red for negative bars
const LABEL_BG = '#1a1a1a';
const GRID = '#262626';
const TEXT = '#e5e5e5';
const TEXT_DIM = '#737373';
const W = 1080;
const H = 1080;

function esc(s: string | number) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number, decimals = 2) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return n.toFixed(decimals);
}

// ── Line chart ────────────────────────────────────────────────────────────────
export function lineChartSvg(opts: {
  dates: string[];
  values: number[];
  label: string;          // e.g. "Gold (USD)"
  valuePrefix?: string;   // e.g. "₹" or "$"
  valueSuffix?: string;   // e.g. "%"
  color?: string;
  markHighDate?: string;  // ISO date to annotate as "HIGH"
  markLowDate?: string;
}): string {
  const {
    dates, values, label,
    valuePrefix = '', valueSuffix = '',
    color = ACCENT,
    markHighDate, markLowDate,
  } = opts;

  const PAD = { top: 80, right: 60, bottom: 80, left: 90 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const x = (i: number) => PAD.left + (i / (values.length - 1)) * cw;
  const y = (v: number) => PAD.top + ch - ((v - minV) / range) * ch;

  // Build polyline points
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // Build fill polygon (close path to bottom)
  const fillPts = [
    `${x(0).toFixed(1)},${(PAD.top + ch).toFixed(1)}`,
    ...values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`),
    `${x(values.length - 1).toFixed(1)},${(PAD.top + ch).toFixed(1)}`,
  ].join(' ');

  // Y-axis grid lines (4 levels)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const v = minV + frac * range;
    const yy = y(v);
    return `
      <line x1="${PAD.left}" y1="${yy.toFixed(1)}" x2="${W - PAD.right}" y2="${yy.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>
      <text x="${PAD.left - 10}" y="${(yy + 5).toFixed(1)}" text-anchor="end" font-size="22" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">${valuePrefix}${fmt(v, 0)}${valueSuffix}</text>
    `;
  }).join('');

  // X-axis labels — show ~5 date labels
  const step = Math.floor(dates.length / 4);
  const xLabels = [0, step, step * 2, step * 3, dates.length - 1].map((i) => {
    if (i >= dates.length) return '';
    const d = dates[i];
    const label = d ? d.slice(0, 7) : ''; // "YYYY-MM"
    return `<text x="${x(i).toFixed(1)}" y="${PAD.top + ch + 45}" text-anchor="middle" font-size="20" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">${esc(label)}</text>`;
  }).join('');

  // Current value
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);
  const currentVal = values[values.length - 1];

  // Optional high/low annotations
  const maxIdx = values.indexOf(maxV);
  const minIdx = values.indexOf(minV);
  const highAnnotation = `
    <circle cx="${x(maxIdx).toFixed(1)}" cy="${y(maxV).toFixed(1)}" r="6" fill="${color}"/>
    <text x="${x(maxIdx).toFixed(1)}" y="${(y(maxV) - 16).toFixed(1)}" text-anchor="middle" font-size="20" fill="${color}" font-family="system-ui,sans-serif" font-weight="700">HIGH</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- grid -->
  ${gridLines}

  <!-- fill under line -->
  <defs>
    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <polygon points="${fillPts}" fill="url(#fillGrad)"/>

  <!-- line -->
  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

  ${xLabels}

  <!-- high annotation -->
  ${highAnnotation}

  <!-- current price dot + label -->
  <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="7" fill="${color}"/>
  <rect x="${(lastX + 14).toFixed(1)}" y="${(lastY - 18).toFixed(1)}" width="160" height="36" rx="4" fill="${color}"/>
  <text x="${(lastX + 94).toFixed(1)}" y="${(lastY + 7).toFixed(1)}" text-anchor="middle" font-size="22" font-weight="700" fill="#000" font-family="system-ui,sans-serif">${esc(valuePrefix + fmt(currentVal, 0) + valueSuffix)}</text>

  <!-- label box (bottom right) -->
  <rect x="${W - PAD.right - 260}" y="${H - PAD.bottom - 100}" width="240" height="64" rx="4" fill="${LABEL_BG}" stroke="${TEXT_DIM}" stroke-width="1.5"/>
  <text x="${W - PAD.right - 140}" y="${H - PAD.bottom - 58}" text-anchor="middle" font-size="26" font-weight="700" fill="${TEXT}" font-family="system-ui,sans-serif">${esc(label)}</text>

  <!-- source -->
  <text x="${PAD.left}" y="${H - 28}" font-size="20" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">Chart: Chartix.in  ·  @chartixin</text>
</svg>`;
}

// ── Vertical bar chart ────────────────────────────────────────────────────────
export type BarItem = { label: string; value: number };

export function barChartSvg(opts: {
  items: BarItem[];
  title: string;
  valueSuffix?: string;
  highlightPositive?: boolean; // orange positive, red negative
}): string {
  const { items, title, valueSuffix = '', highlightPositive = true } = opts;

  const PAD = { top: 140, right: 60, bottom: 100, left: 70 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const n = items.length;
  const barW = Math.min(100, (cw / n) * 0.65);
  const gap = cw / n;

  const vals = items.map((i) => i.value);
  const maxV = Math.max(...vals.map(Math.abs), 0.001);

  // zero line Y
  const minVal = Math.min(...vals);
  const hasNeg = minVal < 0;
  const zeroY = hasNeg
    ? PAD.top + ch * (maxV / (maxV + Math.abs(minVal)))
    : PAD.top + ch;

  const bars = items.map((item, i) => {
    const cx = PAD.left + gap * i + gap / 2;
    const barH = (Math.abs(item.value) / (maxV + Math.abs(minVal))) * ch;
    const isPos = item.value >= 0;
    const by = isPos ? zeroY - barH : zeroY;
    const fill = highlightPositive ? (isPos ? ACCENT : ACCENT2) : ACCENT;
    const valY = isPos ? by - 12 : by + barH + 30;
    return `
      <rect x="${(cx - barW / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" rx="3"/>
      <text x="${cx.toFixed(1)}" y="${valY.toFixed(1)}" text-anchor="middle" font-size="20" font-weight="700" fill="${TEXT}" font-family="system-ui,sans-serif">${esc(fmt(item.value, 1) + valueSuffix)}</text>
      <text x="${cx.toFixed(1)}" y="${(PAD.top + ch + 40).toFixed(1)}" text-anchor="middle" font-size="19" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">${esc(item.label)}</text>
    `;
  }).join('');

  // zero line
  const zeroLine = hasNeg
    ? `<line x1="${PAD.left}" y1="${zeroY.toFixed(1)}" x2="${W - PAD.right}" y2="${zeroY.toFixed(1)}" stroke="${TEXT_DIM}" stroke-width="1.5"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- title -->
  <text x="${W / 2}" y="80" text-anchor="middle" font-size="34" font-weight="700" fill="${TEXT}" font-family="system-ui,sans-serif">${esc(title)}</text>

  ${zeroLine}
  ${bars}

  <!-- source -->
  <text x="${PAD.left}" y="${H - 28}" font-size="20" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">Chart: Chartix.in  ·  @chartixin</text>
</svg>`;
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
export function hbarChartSvg(opts: {
  items: BarItem[];
  title: string;
  valueSuffix?: string;
  source?: string;
}): string {
  const { items, title, valueSuffix = '', source = 'Chartix.in' } = opts;
  const sorted = [...items].sort((a, b) => b.value - a.value);

  const PAD = { top: 130, right: 200, bottom: 60, left: 280 };
  const cw = W - PAD.left - PAD.right;
  const rowH = Math.min(52, (H - PAD.top - PAD.bottom) / sorted.length);
  const maxV = Math.max(...sorted.map((i) => Math.abs(i.value)), 0.001);

  const rows = sorted.map((item, i) => {
    const y = PAD.top + i * rowH;
    const isPos = item.value >= 0;
    const barLen = (Math.abs(item.value) / maxV) * cw;
    const fill = isPos ? ACCENT : ACCENT2;
    const isFirst = i === 0;
    const labelFill = isFirst ? '#000' : TEXT;
    const labelBg = isFirst ? ACCENT : 'none';
    return `
      <rect x="${PAD.left}" y="${(y + 4).toFixed(1)}" width="${barLen.toFixed(1)}" height="${(rowH - 8).toFixed(1)}" fill="${fill}" rx="2"/>
      ${isFirst ? `<rect x="0" y="${y.toFixed(1)}" width="${PAD.left - 10}" height="${rowH.toFixed(1)}" fill="${ACCENT}"/>` : ''}
      <text x="${PAD.left - 14}" y="${(y + rowH / 2 + 8).toFixed(1)}" text-anchor="end" font-size="19" fill="${isFirst ? '#000' : TEXT}" font-weight="${isFirst ? '700' : '400'}" font-family="system-ui,sans-serif">${esc(item.label)}</text>
      <text x="${(PAD.left + barLen + 10).toFixed(1)}" y="${(y + rowH / 2 + 8).toFixed(1)}" font-size="19" font-weight="700" fill="${TEXT}" font-family="system-ui,sans-serif">${esc(fmt(item.value, 0) + valueSuffix)}</text>
    `;
  }).join('');

  const totalH = PAD.top + sorted.length * rowH + PAD.bottom;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" fill="${BG}"/>

  <!-- title -->
  <text x="${W / 2}" y="80" text-anchor="middle" font-size="34" font-weight="700" fill="${TEXT}" font-family="system-ui,sans-serif">${esc(title)}</text>

  ${rows}

  <!-- source -->
  <text x="${PAD.left}" y="${totalH - 16}" font-size="18" fill="${TEXT_DIM}" font-family="system-ui,sans-serif">Source: ${esc(source)}  ·  Chart: Chartix.in  ·  @chartixin</text>
</svg>`;
}
