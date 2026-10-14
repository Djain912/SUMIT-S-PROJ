import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import archive from './fallback/history.json';
import { nseDateToIso, type CashDay, type FnoDay, type Sector } from './format';
import { fetchNsdlSectors } from './nsdl';

type ArchiveRow = {
  date: string;
  fii_buy?: number; fii_sell?: number; fii_net?: number;
  dii_buy?: number; dii_sell?: number; dii_net?: number;
};

// First session from which the cash record is complete and matches exchange
// figures. Earlier rows (open feed, and the July bulk import taken from it)
// failed verification for Jan–Mar 2026 and skip sessions in Apr–early May.
export const CASH_HISTORY_FROM = '2026-05-12';

/** Cleared by the logger cron whenever it stores new data. */
export const FII_DII_CACHE_TAG = 'fii-dii-data';

// Open MrChartist feed, falling back to the bundled copy. Used only to fill
// cash sessions our cron missed; its F&O history failed verification and is not used.
async function getFeed(): Promise<ArchiveRow[]> {
  try {
    const res = await fetch('https://raw.githubusercontent.com/MrChartist/fii-dii-data/main/data/history.json', {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 21600 },
    });
    if (res.ok) {
      const rows = (await res.json()) as ArchiveRow[];
      if (Array.isArray(rows) && rows.length) return rows;
    }
  } catch {
    // fall back to bundled copy
  }
  return archive as ArchiveRow[];
}

// Neon (logged daily from NSE by our cron) is the source of truth; the open
// feed fills sessions the cron missed. Sessions with no data are skipped, never shown as ₹0.
export const getCashDays = unstable_cache(async (): Promise<CashDay[]> => {
  const [rows, feed] = await Promise.all([
    prisma.fiiDiiLog.findMany({
      where: { date: { gte: CASH_HISTORY_FROM } },
      select: { date: true, fiiBuy: true, fiiSell: true, fiiNet: true, diiBuy: true, diiSell: true, diiNet: true },
    }),
    getFeed(),
  ]);
  const byDate = new Map<string, CashDay>();
  for (const r of feed) {
    const iso = nseDateToIso(r.date);
    if (!iso || iso < CASH_HISTORY_FROM || !(r.fii_buy || r.dii_buy)) continue;
    byDate.set(iso, {
      date: iso,
      fiiBuy: r.fii_buy ?? 0, fiiSell: r.fii_sell ?? 0, fiiNet: r.fii_net ?? 0,
      diiBuy: r.dii_buy ?? 0, diiSell: r.dii_sell ?? 0, diiNet: r.dii_net ?? 0,
    });
  }
  for (const r of rows) if (r.fiiBuy > 0 || r.diiBuy > 0) byDate.set(r.date, r);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}, ['fii-dii-cash-days-v2'], { revalidate: 900, tags: [FII_DII_CACHE_TAG] });

// F&O open interest exactly as logged from NSE participant-OI archives by our cron.
export const getFnoDays = unstable_cache(async (): Promise<FnoDay[]> => {
  const rows = await prisma.fnoLog.findMany();
  const out: FnoDay[] = [];
  for (const r of rows) {
    const iso = nseDateToIso(r.date);
    if (!iso || r.fiiIdxFutLong + r.fiiIdxFutShort === 0) continue;
    out.push({
      date: iso,
      fii: {
        idxFut: { long: r.fiiIdxFutLong, short: r.fiiIdxFutShort },
        stkFut: { long: r.fiiStkFutLong, short: r.fiiStkFutShort },
        idxCall: { long: r.fiiIdxCallLong, short: r.fiiIdxCallShort },
        idxPut: { long: r.fiiIdxPutLong, short: r.fiiIdxPutShort },
      },
      dii: {
        idxFut: { long: r.diiIdxFutLong, short: r.diiIdxFutShort },
        stkFut: { long: r.diiStkFutLong, short: r.diiStkFutShort },
      },
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}, ['fii-dii-fno-days-v2'], { revalidate: 900, tags: [FII_DII_CACHE_TAG] });

/** When our cron last wrote fresh cash / F&O data (ISO timestamps). */
export const getLastUpdated = unstable_cache(async () => {
  const [cash, fno] = await Promise.all([
    prisma.fiiDiiLog.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.fnoLog.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
  ]);
  return { cash: cash?.updatedAt.toISOString() ?? null, fno: fno?.updatedAt.toISOString() ?? null };
}, ['fii-dii-last-updated'], { revalidate: 900, tags: [FII_DII_CACHE_TAG] });

/**
 * Sector data comes straight from NSDL's fortnightly reports. If NSDL can't be
 * reached the page shows "unavailable" rather than stale or third-party figures.
 */
export async function getSectors(): Promise<{ sectors: Sector[]; asOf: string | null; error?: string }> {
  try {
    return await fetchNsdlSectors();
  } catch (e) {
    return { sectors: [], asOf: null, error: (e as Error).message };
  }
}
