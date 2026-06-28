import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel calls this daily after market close (~6:30 PM IST / 13:00 UTC).
// Appends the latest NSE trading day's bars to our `stock_eod` store so the
// Index Builder's data stays current. Pulls NSE's official plain "security-wise
// bhavcopy" CSV (all equities in one file), and upserts only the symbols we
// already track. Idempotent — re-running the same day overwrites with identical
// values. Symbols not in our store are ignored (they fall back to Yahoo until
// backfilled), keeping this scoped to the index-library universe.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

// Map a current NSE bhavcopy symbol back to the symbol we store it under, for
// companies that were renamed (e.g. Zomato → Eternal). Keeps daily updates
// flowing to the original ticker the index library references.
const REVERSE_ALIAS: Record<string, string> = { ETERNAL: 'ZOMATO' };

function ddmmyyyy(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}${p(d.getUTCMonth() + 1)}${d.getUTCFullYear()}`;
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchBhavcopy(d: Date): Promise<string | null> {
  const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy(d)}.csv`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*', Referer: 'https://www.nseindia.com/' },
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const text = await r.text();
    return text.includes('SYMBOL') ? text : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only update symbols we already store (the index-library universe).
  const tracked = await prisma.$queryRawUnsafe<Array<{ symbol: string }>>(
    `SELECT DISTINCT symbol FROM stock_eod`,
  );
  const trackedSet = new Set(tracked.map((r) => r.symbol));
  if (trackedSet.size === 0) {
    return NextResponse.json({ ok: false, reason: 'no symbols in store yet' });
  }

  // Find the latest available bhavcopy, walking back over weekends/holidays.
  let csv: string | null = null;
  let barDate = '';
  const today = new Date();
  for (let back = 0; back < 6; back++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back));
    const text = await fetchBhavcopy(d);
    if (text) { csv = text; barDate = iso(d); break; }
  }
  if (!csv) {
    return NextResponse.json({ ok: false, reason: 'no bhavcopy found in last 6 days (NSE may block Vercel IP)' }, { status: 502 });
  }

  // Parse: SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN, HIGH, LOW, LAST, CLOSE, AVG, TTL_TRD_QNTY, ...
  const lines = csv.split('\n');
  const updates: Array<[string, number, number, number, number, number]> = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(',').map((x) => x.trim());
    if (p.length < 11) continue;
    if (p[1] !== 'EQ') continue;
    const sym = REVERSE_ALIAS[p[0]] ?? p[0];
    if (!trackedSet.has(sym)) continue;
    const o = +p[4], h = +p[5], l = +p[6], c = +p[8], v = parseInt(p[10] || '0', 10);
    if (!(c > 0)) continue;
    updates.push([sym, o, h, l, c, isNaN(v) ? 0 : v]);
  }

  // Upsert in batches.
  const BATCH = 400;
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    const vals: string[] = [];
    const params: (string | number)[] = [];
    let n = 1;
    for (const [sym, o, h, l, c, v] of slice) {
      vals.push(`($${n++},$${n++}::date,$${n++},$${n++},$${n++},$${n++},$${n++}::bigint)`);
      params.push(sym, barDate, o, h, l, c, v);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO stock_eod (symbol,d,o,h,l,c,v) VALUES ${vals.join(',')}
       ON CONFLICT (symbol,d) DO UPDATE SET o=EXCLUDED.o,h=EXCLUDED.h,l=EXCLUDED.l,c=EXCLUDED.c,v=EXCLUDED.v`,
      ...params,
    );
    written += slice.length;
  }

  return NextResponse.json({ ok: true, barDate, tracked: trackedSet.size, updated: written });
}
