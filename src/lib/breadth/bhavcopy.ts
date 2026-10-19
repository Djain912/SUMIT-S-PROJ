// NSE daily equity bhavcopy: one zipped CSV per trading day with every stock's
// close and NSE's corporate-action-adjusted previous close.
//   • since Jan 2024:  /content/cm/BhavCopy_NSE_CM_0_0_0_YYYYMMDD_F_0000.csv.zip
//   • before:          /content/historical/EQUITIES/YYYY/MON/cmDDMONYYYYbhav.csv.zip

import JSZip from 'jszip';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type BhavRow = { close: number; prevClose: number };

async function fetchZipCsv(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  if (!res.ok) return null; // 404 = holiday / not yet published
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 10_000) return null; // NSE's "not found" page is small HTML
  const zip = await JSZip.loadAsync(buf);
  const file = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.csv'));
  return file ? file.async('string') : null;
}

function parse(csv: string, cols: { symbol: string; series: string; close: string; prev: string }): Map<string, BhavRow> {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',').map((h) => h.trim());
  const ix = (n: string) => head.indexOf(n);
  const [iSym, iSer, iCls, iPrv] = [ix(cols.symbol), ix(cols.series), ix(cols.close), ix(cols.prev)];
  if ([iSym, iSer, iCls, iPrv].some((i) => i < 0)) throw new Error('Unexpected bhavcopy columns');
  const out = new Map<string, BhavRow>();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const series = c[iSer]?.trim();
    if (series !== 'EQ' && series !== 'BE') continue;
    const close = Number(c[iCls]);
    const prevClose = Number(c[iPrv]);
    if (!(close > 0) || !(prevClose > 0)) continue;
    out.set(c[iSym].trim(), { close, prevClose });
  }
  return out;
}

/** Equity closes for one trading day (YYYY-MM-DD), or null if there is no file. */
export async function fetchBhavcopy(date: string): Promise<Map<string, BhavRow> | null> {
  const [y, m, d] = date.split('-');
  if (date >= '2024-01-01') {
    const csv = await fetchZipCsv(`https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${y}${m}${d}_F_0000.csv.zip`);
    if (csv) return parse(csv, { symbol: 'TckrSymb', series: 'SctySrs', close: 'ClsPric', prev: 'PrvsClsgPric' });
    if (date >= '2024-07-08') return null;
  }
  const mon = MON[Number(m) - 1];
  const csv = await fetchZipCsv(`https://nsearchives.nseindia.com/content/historical/EQUITIES/${y}/${mon}/cm${d}${mon}${y}bhav.csv.zip`);
  return csv ? parse(csv, { symbol: 'SYMBOL', series: 'SERIES', close: 'CLOSE', prev: 'PREVCLOSE' }) : null;
}

/** Current Nifty 500 constituents with their NSE industry. */
export async function fetchNifty500(): Promise<{ symbol: string; industry: string }[]> {
  const res = await fetch('https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv', {
    headers: { 'User-Agent': UA }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Nifty 500 list HTTP ${res.status}`);
  const lines = (await res.text()).split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',');
  const iSym = head.indexOf('Symbol');
  const iInd = head.indexOf('Industry');
  // Company names can contain commas, so read the trailing fixed columns from the right.
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    const off = c.length - head.length;
    return { symbol: c[iSym + off].trim(), industry: c[iInd + off]?.trim() || 'Other' };
  }).filter((r) => r.symbol);
}
