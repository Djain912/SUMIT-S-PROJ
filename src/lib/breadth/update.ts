// Loads new NSE bhavcopy days into StockDaily (Nifty 500 only) and appends
// BreadthDaily rows. Idempotent: safe to run several times an evening.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { fetchBhavcopy, fetchNifty500, type BhavRow } from './bhavcopy';
import { computeBreadth, type BreadthRow, type StockSeries } from './compute';

const HISTORY_DAYS = 430; // calendar days of closes needed for 200-day averages + 52-week range

export const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

function addDays(d: string, n: number) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function weekdaysBetween(fromExclusive: string, toInclusive: string): string[] {
  const out: string[] = [];
  for (let d = addDays(fromExclusive, 1); d <= toInclusive; d = addDays(d, 1)) {
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d);
  }
  return out;
}

export async function getUniverse(): Promise<{ symbols: Set<string>; industries: Map<string, string> }> {
  const list = await fetchNifty500();
  return { symbols: new Set(list.map((r) => r.symbol)), industries: new Map(list.map((r) => [r.symbol, r.industry])) };
}

export async function storeDay(date: string, rows: Map<string, BhavRow>, symbols: Set<string>) {
  const data = [...rows].filter(([s]) => symbols.has(s)).map(([symbol, r]) => ({ symbol, date, close: r.close, prevClose: r.prevClose }));
  if (data.length) await prisma.stockDaily.createMany({ data, skipDuplicates: true });
  return data.length;
}

export function toDb(r: BreadthRow): Prisma.BreadthDailyCreateInput {
  return { ...r, sectors: (r.sectors ?? undefined) as Prisma.InputJsonValue | undefined };
}

/** Recompute breadth for every stored trading day after `afterDate`. */
export async function computeAndStore(afterDate: string | null, industries: Map<string, string>) {
  const seedRow = afterDate ? await prisma.breadthDaily.findUnique({ where: { date: afterDate } }) : null;
  const since = afterDate ? addDays(afterDate, -HISTORY_DAYS) : '0000';
  const closes = await prisma.stockDaily.findMany({ where: { date: { gte: since } }, orderBy: [{ symbol: 'asc' }, { date: 'asc' }] });
  const stocks = new Map<string, StockSeries>();
  const dates = new Set<string>();
  for (const c of closes) {
    dates.add(c.date);
    const s = stocks.get(c.symbol) ?? { dates: [], close: [], prevClose: [] };
    s.dates.push(c.date); s.close.push(c.close); s.prevClose.push(c.prevClose);
    stocks.set(c.symbol, s);
  }
  const calendar = [...dates].sort();
  const from = afterDate ? addDays(afterDate, 1) : calendar[0];
  const rows = computeBreadth(calendar, stocks, industries, from, seedRow ? { adLine: seedRow.adLine, ema19: seedRow.ema19, ema39: seedRow.ema39 } : null);
  for (const r of rows) {
    await prisma.breadthDaily.upsert({ where: { date: r.date }, create: toDb(r), update: toDb(r) });
  }
  return rows;
}

/** Daily job: fetch any missing recent trading days, then extend the breadth series. */
export async function updateBreadth() {
  const lastStock = await prisma.stockDaily.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
  const lastBreadth = await prisma.breadthDaily.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
  if (!lastStock || !lastBreadth) throw new Error('Breadth history is empty — run the backfill script first.');

  const { symbols, industries } = await getUniverse();
  const loaded: string[] = [];
  for (const d of weekdaysBetween(lastStock.date, istToday()).slice(-10)) {
    const rows = await fetchBhavcopy(d);
    if (!rows) continue; // holiday, or today's file isn't published yet
    if (await storeDay(d, rows, symbols)) loaded.push(d);
  }
  const added = await computeAndStore(lastBreadth.date, industries);
  return { loaded, breadthAdded: added.map((r) => r.date), latest: added.at(-1)?.date ?? lastBreadth.date };
}
