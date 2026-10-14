// Shared, client-safe helpers for the FII/DII pages.

export type CashDay = {
  date: string; // YYYY-MM-DD
  fiiBuy: number; fiiSell: number; fiiNet: number;
  diiBuy: number; diiSell: number; diiNet: number;
};

export type LongShort = { long: number; short: number };
export type FnoDay = {
  date: string; // YYYY-MM-DD
  fii: { idxFut: LongShort; stkFut: LongShort; idxCall: LongShort; idxPut: LongShort };
  dii: { idxFut: LongShort; stkFut: LongShort };
};

export type Sector = {
  name: string;
  aumPct: number;
  fortnightCr: number;
  oneYearCr: number;
  historyCr: number[];
};

export const COLORS = {
  fii: '#3b5bdb',
  dii: '#c2792c',
  buy: '#15803d',
  sell: '#c0392b',
  grid: '#EEECE7',
  axis: '#A8A29E',
  ink: '#1c1917',
} as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "08-Jun-2026" → "2026-06-08" */
export function nseDateToIso(d: string): string | null {
  const m = d.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase());
  if (mon < 0) return null;
  return `${m[3]}-${String(mon + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtDate(iso: string, style: 'long' | 'short' | 'day' = 'short'): string {
  if (!iso) return '';
  const d = parse(iso);
  const day = d.getUTCDate(), m = d.getUTCMonth(), y = d.getUTCFullYear();
  if (style === 'long') return `${DAYS[d.getUTCDay()]}, ${day} ${LONG_MONTHS[m]} ${y}`;
  if (style === 'day') return `${day} ${MONTHS[m]}`;
  return `${day} ${MONTHS[m]} ${y}`;
}

export function monthKey(iso: string) { return iso.slice(0, 7); }
export function fmtMonth(key: string, long = false) {
  const [y, m] = key.split('-').map(Number);
  return `${(long ? LONG_MONTHS : MONTHS)[m - 1]} ${y}`;
}

/** Indian-style crore figure. 1 lakh crore = 1,00,000 Cr. */
export function cr(n: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const { sign = true, compact = true } = opts;
  const a = Math.abs(n);
  const s = sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  if (compact && a >= 100000) return `${s}₹${(a / 100000).toFixed(2)} lakh Cr`;
  return `${s}₹${a.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

export function num(n: number, sign = false): string {
  const s = sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  return s + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function sum(rows: CashDay[], k: 'fiiNet' | 'diiNet') {
  return rows.reduce((s, r) => s + r[k], 0);
}

/** Consecutive sessions (ending at the latest) in which `k` kept the same sign. */
export function streak(rows: CashDay[], k: 'fiiNet' | 'diiNet') {
  if (!rows.length) return { n: 0, buying: true };
  const buying = rows[rows.length - 1][k] >= 0;
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if ((rows[i][k] >= 0) !== buying) break;
    n++;
  }
  return { n, buying };
}

export type MonthTotal = { key: string; sessions: number; fii: number; dii: number };
export function monthlyTotals(rows: CashDay[]): MonthTotal[] {
  const map = new Map<string, MonthTotal>();
  for (const r of rows) {
    const k = monthKey(r.date);
    const m = map.get(k) ?? { key: k, sessions: 0, fii: 0, dii: 0 };
    m.sessions++; m.fii += r.fiiNet; m.dii += r.diiNet;
    map.set(k, m);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Plain-English read of the latest session. Facts only — no forecasts. */
export function sessionSummary(rows: CashDay[]): string[] {
  const d = rows[rows.length - 1];
  if (!d) return [];
  const verb = (v: number) => (v < 0 ? 'sold' : 'bought');
  const out: string[] = [
    `Foreign investors (FIIs) ${verb(d.fiiNet)} a net ${cr(d.fiiNet, { sign: false })} and domestic institutions (DIIs) ${verb(d.diiNet)} a net ${cr(d.diiNet, { sign: false })}.`,
  ];
  if (d.fiiNet < 0 && d.diiNet > 0) {
    const cover = d.diiNet / Math.abs(d.fiiNet);
    out.push(cover >= 1
      ? 'Domestic buying more than absorbed the foreign selling, so institutions were net buyers overall.'
      : `Domestic buying absorbed about ${Math.round(cover * 100)}% of the foreign selling.`);
  } else if (d.fiiNet < 0 && d.diiNet < 0) {
    out.push('Both groups were net sellers — the weakest combination for the market.');
  } else if (d.fiiNet > 0 && d.diiNet > 0) {
    out.push('Both groups were net buyers — the strongest combination for the market.');
  } else if (d.fiiNet > 0 && d.diiNet < 0) {
    out.push('Foreign buying met domestic profit-taking.');
  }
  const f = streak(rows, 'fiiNet');
  const di = streak(rows, 'diiNet');
  const parts: string[] = [];
  if (f.n >= 2) parts.push(`FIIs have ${f.buying ? 'bought' : 'sold'} for ${f.n} sessions in a row`);
  if (di.n >= 2) parts.push(`DIIs have ${di.buying ? 'bought' : 'sold'} for ${di.n} sessions in a row`);
  if (parts.length) out.push(parts.join(', and ') + '.');
  return out;
}

/** Share of contracts held long, 0–100. */
export const longShare = (p: LongShort) => (p.long + p.short === 0 ? 50 : (p.long / (p.long + p.short)) * 100);

export function stance(longPct: number): string {
  if (longPct < 25) return 'heavily short';
  if (longPct < 45) return 'leaning short';
  if (longPct <= 55) return 'balanced';
  if (longPct <= 75) return 'leaning long';
  return 'heavily long';
}

/** Round a span to tidy axis ticks. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count + 1.5) ?? 10 * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function axisCr(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 100000) return `${s}${(a / 100000).toFixed(a % 100000 === 0 ? 0 : 1)}L`;
  if (a >= 1000) return `${s}${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k`;
  return `${s}${a}`;
}

/** Rows within `days` calendar days of the latest row (rows sorted ascending by ISO date). */
export function lastDays<T extends { date: string }>(rows: T[], days: number): T[] {
  if (!rows.length) return rows;
  const end = new Date(`${rows[rows.length - 1].date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - days);
  const cutoff = end.toISOString().slice(0, 10);
  return rows.filter((r) => r.date > cutoff);
}

/** "12 Oct 2026, 7:02 pm IST" */
export function fmtStamp(isoTs: string | null): string {
  if (!isoTs) return '';
  const d = new Date(isoTs);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).replace('Sept', 'Sep');
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toLowerCase();
  return `${date}, ${time} IST`;
}

/** The six F&O positions charted on the site and in the Telegram card. */
export const FNO_POSITIONS: { key: string; title: string; who: 'fii' | 'dii'; pick: (d: FnoDay) => LongShort; hint: string }[] = [
  { key: 'fii-idx-fut', title: 'FII index futures', who: 'fii', pick: (d) => d.fii.idxFut, hint: 'Below zero = net short the index' },
  { key: 'fii-idx-call', title: 'FII index calls', who: 'fii', pick: (d) => d.fii.idxCall, hint: 'Below zero = net call writers' },
  { key: 'fii-idx-put', title: 'FII index puts', who: 'fii', pick: (d) => d.fii.idxPut, hint: 'Above zero = net put buyers (protection)' },
  { key: 'fii-stk-fut', title: 'FII stock futures', who: 'fii', pick: (d) => d.fii.stkFut, hint: 'Single-stock futures, often paired with cash holdings' },
  { key: 'dii-idx-fut', title: 'DII index futures', who: 'dii', pick: (d) => d.dii.idxFut, hint: 'Mostly hedging by domestic funds' },
  { key: 'dii-stk-fut', title: 'DII stock futures', who: 'dii', pick: (d) => d.dii.stkFut, hint: 'Largely hedges and arbitrage — a big short is normal' },
];

