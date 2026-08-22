// Generates self-contained SVG charts — clean white minimalist style,
// Twitter-friendly 16:9 (1600×900).

const BG = '#ffffff';
const LINE_COLOR = '#1a1a2e';
const ACCENT_POS = '#10b981';   // emerald for positive
const ACCENT_NEG = '#ef4444';   // red for negative
const GRID = '#f0f0f0';
const BORDER = '#e5e7eb';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6b7280';
const TEXT_MUTED = '#9ca3af';
const BRAND_ACCENT = '#7c3aed'; // violet for Chartix brand touches

const W = 1600;
const H = 900;

function esc(s: string | number) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number, decimals = 2) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return n.toFixed(decimals);
}

function fmtCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  if (Math.abs(n) >= 1_000) return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return n.toFixed(n < 10 ? 2 : 0);
}

// ── Line chart ────────────────────────────────────────────────────────────────
export function lineChartSvg(opts: {
  dates: string[];
  values: number[];
  label: string;
  valuePrefix?: string;
  valueSuffix?: string;
  color?: string;
  markHighDate?: string;
  markLowDate?: string;
}): string {
  const {
    dates, values, label,
    valuePrefix = '', valueSuffix = '',
    color = LINE_COLOR,
  } = opts;

  const PAD = { top: 100, right: 100, bottom: 100, left: 120 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const padRange = range * 0.05;

  const x = (i: number) => PAD.left + (i / (values.length - 1)) * cw;
  const y = (v: number) => PAD.top + ch - ((v - (minV - padRange)) / (range + 2 * padRange)) * ch;

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const fillPts = [
    `${x(0).toFixed(1)},${(PAD.top + ch).toFixed(1)}`,
    ...values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`),
    `${x(values.length - 1).toFixed(1)},${(PAD.top + ch).toFixed(1)}`,
  ].join(' ');

  // Y-axis grid — 5 levels, dashed
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const v = (minV - padRange) + frac * (range + 2 * padRange);
    const yy = y(v);
    return `
      <line x1="${PAD.left}" y1="${yy.toFixed(1)}" x2="${W - PAD.right}" y2="${yy.toFixed(1)}" stroke="${GRID}" stroke-width="1" stroke-dasharray="6,4"/>
      <text x="${PAD.left - 16}" y="${(yy + 5).toFixed(1)}" text-anchor="end" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">${valuePrefix}${fmtCompact(v)}${valueSuffix}</text>
    `;
  }).join('');

  // X-axis — ~5 date labels
  const step = Math.floor(dates.length / 4);
  const xLabels = [0, step, step * 2, step * 3, dates.length - 1].map((i) => {
    if (i >= dates.length) return '';
    const d = dates[i];
    const parts = d ? d.split('-') : [];
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const displayDate = parts.length >= 2 ? `${monthNames[parseInt(parts[1], 10)] || parts[1]} '${parts[0]?.slice(2)}` : '';
    return `<text x="${x(i).toFixed(1)}" y="${PAD.top + ch + 30}" text-anchor="middle" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">${esc(displayDate)}</text>`;
  }).join('');

  // Current value + 1d change
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);
  const currentVal = values[values.length - 1];
  const prevVal = values.length >= 2 ? values[values.length - 2] : currentVal;
  const pctChange = prevVal !== 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
  const changeColor = pctChange >= 0 ? ACCENT_POS : ACCENT_NEG;
  const changeSign = pctChange >= 0 ? '+' : '';

  // High/low annotations
  const maxIdx = values.indexOf(maxV);
  const minIdx = values.indexOf(minV);

  // Position label inside viewBox
  const labelX = Math.min(lastX, W - PAD.right - 10);
  const labelY = lastY < PAD.top + 60 ? lastY + 30 : lastY - 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND_ACCENT}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${BRAND_ACCENT}" stop-opacity="0.01"/>
    </linearGradient>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${BORDER}" stroke-width="1" rx="0"/>

  <!-- header -->
  <text x="${PAD.left}" y="48" font-size="28" font-weight="700" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif" letter-spacing="-0.02em">${esc(label)}</text>
  <text x="${PAD.left}" y="76" font-size="22" font-weight="600" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif">${esc(valuePrefix + fmt(currentVal, 0) + valueSuffix)}</text>
  <text x="${PAD.left + 140}" y="76" font-size="16" font-weight="600" fill="${changeColor}" font-family="'Inter',system-ui,sans-serif">${esc(changeSign + pctChange.toFixed(2) + '%')}</text>

  <!-- grid -->
  ${gridLines}

  <!-- area fill -->
  <polygon points="${fillPts}" fill="url(#fillGrad)"/>

  <!-- line -->
  <polyline points="${pts}" fill="none" stroke="${BRAND_ACCENT}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

  ${xLabels}

  <!-- 52w high dot -->
  <circle cx="${x(maxIdx).toFixed(1)}" cy="${y(maxV).toFixed(1)}" r="4" fill="none" stroke="${TEXT_MUTED}" stroke-width="1.5"/>
  <text x="${x(maxIdx).toFixed(1)}" y="${(y(maxV) - 12).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">${valuePrefix}${fmtCompact(maxV)}${valueSuffix}</text>

  <!-- 52w low dot -->
  <circle cx="${x(minIdx).toFixed(1)}" cy="${y(minV).toFixed(1)}" r="4" fill="none" stroke="${TEXT_MUTED}" stroke-width="1.5"/>
  <text x="${x(minIdx).toFixed(1)}" y="${(y(minV) + 22).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">${valuePrefix}${fmtCompact(minV)}${valueSuffix}</text>

  <!-- current dot -->
  <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5" fill="${BRAND_ACCENT}"/>

  <!-- footer -->
  <line x1="${PAD.left}" y1="${H - 52}" x2="${W - PAD.right}" y2="${H - 52}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${PAD.left}" y="${H - 28}" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">chartix.in</text>
  <text x="${W - PAD.right}" y="${H - 28}" text-anchor="end" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">@chartixin</text>
</svg>`;
}

// ── Vertical bar chart ────────────────────────────────────────────────────────
export type BarItem = { label: string; value: number };

export function barChartSvg(opts: {
  items: BarItem[];
  title: string;
  valueSuffix?: string;
  highlightPositive?: boolean;
}): string {
  const { items, title, valueSuffix = '', highlightPositive = true } = opts;

  const PAD = { top: 120, right: 80, bottom: 100, left: 80 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const n = items.length;
  const gap = cw / n;
  const barW = Math.min(80, gap * 0.55);

  const vals = items.map((i) => i.value);
  const maxV = Math.max(...vals.map(Math.abs), 0.001);
  const minVal = Math.min(...vals);
  const hasNeg = minVal < 0;
  const totalRange = maxV + (hasNeg ? Math.abs(minVal) : 0);
  const zeroY = hasNeg ? PAD.top + ch * (maxV / totalRange) : PAD.top + ch;

  const bars = items.map((item, i) => {
    const cx = PAD.left + gap * i + gap / 2;
    const barH = (Math.abs(item.value) / totalRange) * ch;
    const isPos = item.value >= 0;
    const by = isPos ? zeroY - barH : zeroY;
    const fill = highlightPositive ? (isPos ? ACCENT_POS : ACCENT_NEG) : BRAND_ACCENT;
    const valY = isPos ? by - 10 : by + barH + 22;
    return `
      <rect x="${(cx - barW / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(barH, 1).toFixed(1)}" fill="${fill}" rx="4"/>
      <text x="${cx.toFixed(1)}" y="${valY.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="600" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif">${esc(fmt(item.value, 1) + valueSuffix)}</text>
      <text x="${cx.toFixed(1)}" y="${(PAD.top + ch + 28).toFixed(1)}" text-anchor="middle" font-size="13" fill="${TEXT_SECONDARY}" font-family="'Inter',system-ui,sans-serif">${esc(item.label)}</text>
    `;
  }).join('');

  const zeroLine = hasNeg
    ? `<line x1="${PAD.left}" y1="${zeroY.toFixed(1)}" x2="${W - PAD.right}" y2="${zeroY.toFixed(1)}" stroke="${BORDER}" stroke-width="1.5"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${BORDER}" stroke-width="1"/>

  <!-- title -->
  <text x="${W / 2}" y="60" text-anchor="middle" font-size="26" font-weight="700" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif" letter-spacing="-0.02em">${esc(title)}</text>

  ${zeroLine}
  ${bars}

  <!-- footer -->
  <line x1="${PAD.left}" y1="${H - 52}" x2="${W - PAD.right}" y2="${H - 52}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${PAD.left}" y="${H - 28}" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">chartix.in</text>
  <text x="${W - PAD.right}" y="${H - 28}" text-anchor="end" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">@chartixin</text>
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

  const PAD = { top: 110, right: 160, bottom: 70, left: 260 };
  const cw = W - PAD.left - PAD.right;
  const rowH = Math.min(48, (H - PAD.top - PAD.bottom) / sorted.length);
  const maxV = Math.max(...sorted.map((i) => Math.abs(i.value)), 0.001);

  const rows = sorted.map((item, i) => {
    const rowY = PAD.top + i * rowH;
    const isPos = item.value >= 0;
    const barLen = (Math.abs(item.value) / maxV) * cw;
    const fill = isPos ? ACCENT_POS : ACCENT_NEG;
    const isFirst = i === 0;
    return `
      <rect x="${PAD.left}" y="${(rowY + 6).toFixed(1)}" width="${barLen.toFixed(1)}" height="${(rowH - 12).toFixed(1)}" fill="${fill}" rx="3" opacity="${isFirst ? '1' : '0.7'}"/>
      <text x="${PAD.left - 14}" y="${(rowY + rowH / 2 + 5).toFixed(1)}" text-anchor="end" font-size="14" fill="${isFirst ? TEXT_PRIMARY : TEXT_SECONDARY}" font-weight="${isFirst ? '700' : '400'}" font-family="'Inter',system-ui,sans-serif">${esc(item.label)}</text>
      <text x="${(PAD.left + barLen + 12).toFixed(1)}" y="${(rowY + rowH / 2 + 5).toFixed(1)}" font-size="14" font-weight="600" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif">${esc(fmt(item.value, 1) + valueSuffix)}</text>
    `;
  }).join('');

  const totalH = Math.max(H, PAD.top + sorted.length * rowH + PAD.bottom);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" fill="${BG}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${totalH - 1}" fill="none" stroke="${BORDER}" stroke-width="1"/>

  <!-- title -->
  <text x="${W / 2}" y="56" text-anchor="middle" font-size="26" font-weight="700" fill="${TEXT_PRIMARY}" font-family="'Inter',system-ui,sans-serif" letter-spacing="-0.02em">${esc(title)}</text>

  ${rows}

  <!-- footer -->
  <line x1="${PAD.left}" y1="${totalH - 46}" x2="${W - PAD.right}" y2="${totalH - 46}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${PAD.left}" y="${totalH - 22}" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">Source: ${esc(source)}  ·  chartix.in</text>
  <text x="${W - PAD.right}" y="${totalH - 22}" text-anchor="end" font-size="13" fill="${TEXT_MUTED}" font-family="'Inter',system-ui,sans-serif">@chartixin</text>
</svg>`;
}
