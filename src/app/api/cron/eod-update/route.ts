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
// companies renamed on the exchange. The library now uses current NSE symbols
// (e.g. ETERNAL directly), so no remapping is needed at present.
const REVERSE_ALIAS: Record<string, string> = {};

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

// NSE's daily "all indices" close file — official index OHLC for the day.
// Rows whose UPPERCASED "Index Name" matches a symbol already in stock_eod
// (e.g. 'NIFTY 50', backfilled by scripts/index-eod-backfill.mjs) get upserted,
// so official index series stay current with zero extra config.
async function fetchIndexClose(d: Date): Promise<string | null> {
  const url = `https://archives.nseindia.com/content/indices/ind_close_all_${ddmmyyyy(d)}.csv`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*', Referer: 'https://www.nseindia.com/' },
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const text = await r.text();
    return text.includes('Index Name') ? text : null;
  } catch {
    return null;
  }
}

// Sensex is BSE — not in NSE files. Pull the last few days from Yahoo ^BSESN;
// failures are non-fatal (the next run catches up via the 5-day window).
async function fetchSensexRecent(): Promise<Array<[string, number, number, number, number, number]>> {
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=5d',
      { headers: { 'User-Agent': UA }, cache: 'no-store' },
    );
    if (!r.ok) return [];
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    if (!res?.timestamp?.length) return [];
    const q = res.indicators.quote[0];
    const out: Array<[string, number, number, number, number, number]> = [];
    for (let i = 0; i < res.timestamp.length; i++) {
      const c = q.close?.[i];
      if (!(c > 0)) continue;
      const day = new Date(res.timestamp[i] * 1000).toISOString().slice(0, 10);
      out.push([day, q.open?.[i] ?? c, q.high?.[i] ?? c, q.low?.[i] ?? c, c, Math.round(q.volume?.[i] || 0)]);
    }
    return out;
  } catch {
    return [];
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

  // ── Official NSE index series (Nifty 50, sector indices…) ──
  let indexUpdated = 0;
  const idxCsv = await fetchIndexClose(new Date(barDate + 'T00:00:00Z'));
  if (idxCsv) {
    // Index Name,Index Date,Open,High,Low,Close,... — Date is DD-MM-YYYY.
    const idxLines = idxCsv.split('\n');
    const idxUpdates: Array<[string, string, number, number, number, number, number]> = [];
    const seen = new Set<string>();
    for (let i = 1; i < idxLines.length; i++) {
      // Split respecting simple CSV (index names contain no commas in this file).
      const p = idxLines[i].split(',').map((x) => x.trim());
      if (p.length < 9) continue;
      const sym = p[0].toUpperCase();
      if (!trackedSet.has(sym) || seen.has(sym)) continue;
      const dm = p[1].match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (!dm) continue;
      const day = `${dm[3]}-${dm[2]}-${dm[1]}`;
      const o = +p[2], h = +p[3], l = +p[4], c = +p[5];
      const v = parseInt(p[8] || '0', 10);
      if (!(c > 0)) continue;
      seen.add(sym);
      idxUpdates.push([sym, day, isNaN(o) ? c : o, isNaN(h) ? c : h, isNaN(l) ? c : l, c, isNaN(v) ? 0 : v]);
    }
    for (const [sym, day, o, h, l, c, v] of idxUpdates) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO stock_eod (symbol,d,o,h,l,c,v) VALUES ($1,$2::date,$3,$4,$5,$6,$7::bigint)
         ON CONFLICT (symbol,d) DO UPDATE SET o=EXCLUDED.o,h=EXCLUDED.h,l=EXCLUDED.l,c=EXCLUDED.c,v=EXCLUDED.v`,
        sym, day, o, h, l, c, v,
      );
      indexUpdated++;
    }
  }

  // Sensex (BSE) via Yahoo — last 5 sessions, non-fatal on failure.
  let sensexUpdated = 0;
  if (trackedSet.has('SENSEX')) {
    for (const [day, o, h, l, c, v] of await fetchSensexRecent()) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO stock_eod (symbol,d,o,h,l,c,v) VALUES ('SENSEX',$1::date,$2,$3,$4,$5,$6::bigint)
         ON CONFLICT (symbol,d) DO UPDATE SET o=EXCLUDED.o,h=EXCLUDED.h,l=EXCLUDED.l,c=EXCLUDED.c,v=EXCLUDED.v`,
        day, o, h, l, c, v,
      );
      sensexUpdated++;
    }
  }

  return NextResponse.json({
    ok: true, barDate, tracked: trackedSet.size, updated: written,
    indexUpdated, sensexUpdated,
  });
}
