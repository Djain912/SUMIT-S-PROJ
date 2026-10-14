import type { Sector } from './format';

// Sector-wise FPI holdings and flows straight from NSDL's fortnightly reports.
// Each report is an HTML table (24 sectors × 98 columns) carrying, for equity:
// AUC at the previous fortnight end, net investment for the previous and the
// current fortnight, and AUC at the current fortnight end.

const BASE = 'https://www.fpi.nsdl.co.in/web/';
const LIST_URL = `${BASE}Reports/FPI_Fortnightly_Selection.aspx`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

// Equity (INR Cr) column indexes in a report data row.
const COL = { name: 1, flowPrev: 26, flowCur: 50, aucCur: 74 } as const;
const COLS_PER_ROW = 98;

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

type ReportRef = { url: string; date: string };
type ReportRow = { name: string; flowPrev: number; flowCur: number; aucCur: number };

async function get(url: string, revalidate: number): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`NSDL ${res.status} for ${url}`);
  return res.text();
}

/** "SEP 30, 2026" / "JUNE 15, 2026" / "January 31, 2012" → "2026-09-30" */
function parseLabel(label: string): string | null {
  const m = label.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  const mm = m && MONTHS[m[1].slice(0, 3).toLowerCase()];
  return m && mm ? `${m[3]}-${mm}-${m[2].padStart(2, '0')}` : null;
}

async function listReports(): Promise<ReportRef[]> {
  const html = await get(LIST_URL, 60 * 60 * 6);
  const refs = [...html.matchAll(/<option[^>]*value="~\/([^"]+\.html)"[^>]*>([^<]+)<\/option>/gi)]
    .map((m) => ({ url: BASE + m[1], date: parseLabel(m[2]) }))
    .filter((r): r is ReportRef => !!r.date);
  if (!refs.length) throw new Error('NSDL report list is empty');
  return refs.sort((a, b) => b.date.localeCompare(a.date));
}

const cellText = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const crore = (s: string) => {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : 0;
};

async function readReport(url: string, revalidate: number): Promise<ReportRow[]> {
  const html = await get(url, revalidate);
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cellText(c[1])))
    .filter((r) => /^\d+$/.test(r[0]) && r.length === COLS_PER_ROW);
  if (rows.length < 20) throw new Error(`Unexpected NSDL report layout (${rows.length} sector rows) in ${url}`);
  return rows.map((r) => ({
    name: r[COL.name],
    flowPrev: crore(r[COL.flowPrev]),
    flowCur: crore(r[COL.flowCur]),
    aucCur: crore(r[COL.aucCur]),
  }));
}

/** Latest NSDL sector snapshot plus 24-fortnight (one-year) flow history. */
export async function fetchNsdlSectors(): Promise<{ sectors: Sector[]; asOf: string }> {
  const refs = await listReports();
  // Every other report covers two fortnights, so 12 reports span 24 fortnights.
  const picks = refs.filter((_, i) => i % 2 === 0).slice(0, 12);
  // Older reports never change; only the newest needs a short revalidation.
  const reports = await Promise.all(picks.map((r, i) => readReport(r.url, i === 0 ? 60 * 60 * 6 : 60 * 60 * 24 * 30)));

  const latest = reports[0];
  const totalAuc = latest.reduce((s, r) => s + r.aucCur, 0);
  const sectors: Sector[] = latest.map((row) => {
    // Fortnight flows oldest → newest across the picked reports.
    const flows: number[] = [];
    for (let i = reports.length - 1; i >= 0; i--) {
      const r = reports[i].find((x) => x.name === row.name);
      flows.push(r?.flowPrev ?? 0, r?.flowCur ?? 0);
    }
    return {
      name: row.name,
      aumPct: totalAuc ? (row.aucCur / totalAuc) * 100 : 0,
      fortnightCr: row.flowCur,
      oneYearCr: flows.slice(-24).reduce((s, v) => s + v, 0),
      historyCr: flows.slice(-13),
    };
  });
  return { sectors, asOf: refs[0].date };
}
