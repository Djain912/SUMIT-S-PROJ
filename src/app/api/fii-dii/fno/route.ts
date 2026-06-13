import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Fetches participant-wise F&O Open Interest straight from NSE's public
// archives, so the dashboard's F&O panel stays current even when the upstream
// MrChartist feed lags (it publishes cash same-day but F&O a day or two late).
//
// NSE file: https://archives.nseindia.com/content/nsccl/fao_participant_oi_DDMMYYYY.csv
// One file per trading day. We try the last several calendar days and return
// every day that has data, newest first. If NSE blocks the server IP the route
// fails softly and the dashboard keeps showing whatever history it already has.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const DAYS_TO_TRY = 8; // calendar days back — covers weekends/holidays
const TTL_SECONDS = 60 * 30; // 30 min
const CACHE_KEY = 'fii-dii:fno-oi';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type FnoRow = {
  date: string; // "DD-Mon-YYYY" to match the dashboard's history format
  fii_idx_fut_long: number; fii_idx_fut_short: number;
  fii_stk_fut_long: number; fii_stk_fut_short: number;
  fii_idx_call_long: number; fii_idx_call_short: number;
  fii_idx_put_long: number; fii_idx_put_short: number;
  dii_idx_fut_long: number; dii_idx_fut_short: number;
  dii_stk_fut_long: number; dii_stk_fut_short: number;
  dii_idx_call_long: number; dii_idx_call_short: number;
  dii_idx_put_long: number; dii_idx_put_short: number;
};

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

const num = (v: string | undefined) => parseFloat(String(v ?? 0).replace(/,/g, '').trim()) || 0;

// Parse one participant-OI CSV. Column order is fixed by NSE:
// Client Type, FutIdxLong, FutIdxShort, FutStkLong, FutStkShort,
// OptIdxCallLong, OptIdxPutLong, OptIdxCallShort, OptIdxPutShort, ...
function parseCsv(csv: string, date: string): FnoRow | null {
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const row: FnoRow = {
    date,
    fii_idx_fut_long: 0, fii_idx_fut_short: 0, fii_stk_fut_long: 0, fii_stk_fut_short: 0,
    fii_idx_call_long: 0, fii_idx_call_short: 0, fii_idx_put_long: 0, fii_idx_put_short: 0,
    dii_idx_fut_long: 0, dii_idx_fut_short: 0, dii_stk_fut_long: 0, dii_stk_fut_short: 0,
    dii_idx_call_long: 0, dii_idx_call_short: 0, dii_idx_put_long: 0, dii_idx_put_short: 0,
  };
  let found = false;
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim());
    const who = cols[0]?.toUpperCase();
    if (who !== 'FII' && who !== 'DII') continue;
    found = true;
    const v = {
      idxFutLong: num(cols[1]), idxFutShort: num(cols[2]),
      stkFutLong: num(cols[3]), stkFutShort: num(cols[4]),
      idxCallLong: num(cols[5]), idxPutLong: num(cols[6]),
      idxCallShort: num(cols[7]), idxPutShort: num(cols[8]),
    };
    const p = who === 'FII' ? 'fii' : 'dii';
    const set = (k: string, val: number) => { (row as Record<string, number | string>)[`${p}_${k}`] = val; };
    set('idx_fut_long', v.idxFutLong);
    set('idx_fut_short', v.idxFutShort);
    set('stk_fut_long', v.stkFutLong);
    set('stk_fut_short', v.stkFutShort);
    set('idx_call_long', v.idxCallLong);
    set('idx_call_short', v.idxCallShort);
    set('idx_put_long', v.idxPutLong);
    set('idx_put_short', v.idxPutShort);
  }
  // Guard against an "empty" file (header only, all zeros)
  if (!found || row.fii_idx_fut_long + row.fii_idx_fut_short === 0) return null;
  return row;
}

async function fetchFnoHistory(): Promise<FnoRow[]> {
  const out: FnoRow[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS_TO_TRY; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const url = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const csv = await res.text();
      const parsed = parseCsv(csv, `${dd}-${MONTHS[d.getMonth()]}-${yyyy}`);
      if (parsed) out.push(parsed);
    } catch {
      // Skip this day on any network/parse error
    }
  }
  return out;
}

export async function GET() {
  const r = getRedis();
  try {
    if (r) {
      const cached = await r.get<FnoRow[]>(CACHE_KEY);
      if (Array.isArray(cached) && cached.length > 0) {
        return NextResponse.json(cached, { headers: { 'x-fno-source': 'cache' } });
      }
    }
    const rows = await fetchFnoHistory();
    if (rows.length === 0) {
      return NextResponse.json({ error: 'no F&O data available' }, { status: 502 });
    }
    if (r) await r.set(CACHE_KEY, rows, { ex: TTL_SECONDS });
    return NextResponse.json(rows, { headers: { 'x-fno-source': 'nse' } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'fetch failed' },
      { status: 502 },
    );
  }
}
