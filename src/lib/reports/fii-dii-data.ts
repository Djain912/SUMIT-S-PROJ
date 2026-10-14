import { prisma } from '@/lib/db/prisma';
import { getSectors } from '@/lib/fii-dii/data';

/**
 * Real data for the FII/DII report images (weekly + monthly). No LLM
 * involved anywhere in this file - every number here comes straight from
 * our own Neon FiiDiiLog table, or from the sector-allocation snapshot the
 * public FII/DII terminal already uses.
 */

export type CumulativeFlow = {
  periodLabel: string;      // "27 Jul – 2 Aug 2026" / "July 2026"
  fromDate: string;
  toDate: string;
  sessionCount: number;
  fiiNetCr: number;
  diiNetCr: number;
  combinedCr: number;
};

/** Sums daily FiiDiiLog rows over the trailing N calendar days. */
export async function getCumulativeFlow(days: 7 | 30): Promise<CumulativeFlow | null> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);

  const rows = await prisma.fiiDiiLog.findMany({
    where: { date: { gte: from.toISOString().slice(0, 10), lte: to.toISOString().slice(0, 10) } },
    orderBy: { date: 'asc' },
    select: { date: true, fiiNet: true, diiNet: true },
  });

  if (rows.length === 0) return null;

  const fiiNetCr = rows.reduce((s, r) => s + r.fiiNet, 0);
  const diiNetCr = rows.reduce((s, r) => s + r.diiNet, 0);
  const fromDate = rows[0].date;
  const toDate = rows[rows.length - 1].date;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const periodLabel = days === 30
    ? new Date(toDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : `${fmt(fromDate)} – ${fmt(toDate)}`;

  return {
    periodLabel, fromDate, toDate,
    sessionCount: rows.length,
    fiiNetCr, diiNetCr, combinedCr: fiiNetCr + diiNetCr,
  };
}

export type SectorRow = {
  name: string;
  fortnightCr: number;
  oneYearCr: number;
  aumPct: number;
};

export type SectorSnapshot = {
  rows: SectorRow[];
  /** NSDL report date, e.g. "30 Sep 2026" — always shown on the image. */
  asOf: string | null;
};

/** Top sectors by fortnight flow, from the same direct NSDL source as the public page. */
export async function getSectorSnapshot(topN = 8): Promise<SectorSnapshot | null> {
  const { sectors, asOf } = await getSectors();
  if (!sectors.length) return null;
  const rows: SectorRow[] = sectors
    .map((r) => ({ name: r.name, fortnightCr: r.fortnightCr, oneYearCr: r.oneYearCr, aumPct: r.aumPct }))
    .sort((a, b) => Math.abs(b.fortnightCr) - Math.abs(a.fortnightCr))
    .slice(0, topN);
  const label = asOf
    ? new Date(`${asOf}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('Sept', 'Sep')
    : null;
  return { rows, asOf: label };
}
