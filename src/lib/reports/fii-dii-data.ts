import { prisma } from '@/lib/db/prisma';

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
  /** NSDL reporting date embedded in the source file, e.g. "Apr152026" -> "15 Apr 2026" */
  asOf: string | null;
  source: 'github' | 'local-fallback';
};

const MONTH_ABBR: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseLastDate(raw: string | undefined): string | null {
  // Source format: "Apr152026" (Mon + DD + YYYY, no separators)
  if (!raw) return null;
  const m = raw.match(/^([A-Za-z]{3})(\d{1,2})(\d{4})$/);
  if (!m) return null;
  const [, mon, day, year] = m;
  const mm = MONTH_ABBR[mon];
  if (!mm) return null;
  const d = new Date(`${year}-${mm}-${String(day).padStart(2, '0')}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Same two-source pattern as the public FII/DII terminal: try the live
 * GitHub-hosted snapshot first, fall back to our bundled local copy if it's
 * unreachable. The local copy can be stale, so `asOf` (parsed from the
 * source's own `lastDate` field) is always surfaced and must be shown on
 * the image - never silently presented as "this week's" data.
 */
export async function getSectorSnapshot(topN = 8): Promise<SectorSnapshot | null> {
  type RawRow = { name: string; fortnightCr: number; oneYearCr: number; aumPct: number; lastDate?: string };

  let raw: RawRow[] | null = null;
  let source: SectorSnapshot['source'] = 'github';

  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/MrChartist/fii-dii-data/main/data/sectors.json',
      { signal: AbortSignal.timeout(8000), cache: 'no-store' },
    );
    if (res.ok) raw = await res.json();
  } catch {
    // fall through to local
  }

  if (!raw || raw.length === 0) {
    source = 'local-fallback';
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const p = path.join(process.cwd(), 'public', 'fii-dii-app', 'data', 'sectors.json');
      raw = JSON.parse(await fs.readFile(p, 'utf8'));
    } catch {
      return null;
    }
  }

  if (!raw || raw.length === 0) return null;

  const rows: SectorRow[] = raw
    .map((r) => ({ name: r.name, fortnightCr: r.fortnightCr, oneYearCr: r.oneYearCr, aumPct: r.aumPct }))
    .sort((a, b) => Math.abs(b.fortnightCr) - Math.abs(a.fortnightCr))
    .slice(0, topN);

  return { rows, asOf: parseLastDate(raw[0]?.lastDate), source };
}
