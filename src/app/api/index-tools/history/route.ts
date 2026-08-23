import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side proxy for Yahoo Finance daily price history.
// Scaling strategy: we fetch and cache each symbol's FULL history once
// (a wide window), then slice it to whatever date range the user asks for.
// So almost every index build is served from Redis — Yahoo is hit at most
// once per symbol per cache window, no matter how many users or date ranges.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

// How far back the cached full history goes (covers virtually all backtests).
const LOOKBACK_YEARS = 20;
// Cache TTL for full history. Daily bars finalise after market close, so a few
// hours keeps data fresh while still collapsing all traffic to ~1 call/symbol.
const FULL_TTL_SECONDS = 60 * 60 * 6; // 6h

type FullHistory = {
  symbol: string;
  dates: string[];
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  adjclose: (number | null)[] | null;
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

// Filter the full history down to the requested [start, end] window.
// Date strings are YYYY-MM-DD so lexicographic comparison is correct.
function sliceRange(full: FullHistory, start: string, end: string) {
  const out: FullHistory = {
    symbol: full.symbol,
    dates: [],
    open: [],
    high: [],
    low: [],
    close: [],
    adjclose: full.adjclose ? [] : null,
  };
  const fadj = full.adjclose;
  for (let i = 0; i < full.dates.length; i++) {
    const d = full.dates[i];
    if (d >= start && d <= end) {
      out.dates.push(d);
      out.open.push(full.open[i] ?? null);
      out.high.push(full.high[i] ?? null);
      out.low.push(full.low[i] ?? null);
      out.close.push(full.close[i] ?? null);
      if (out.adjclose && fadj) out.adjclose.push(fadj[i] ?? null);
    }
  }
  return out;
}

async function fetchFullHistory(symbol: string): Promise<FullHistory | null> {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - LOOKBACK_YEARS * 365 * 24 * 60 * 60;
  const p2 = now + 86_400;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${p1}&period2=${p2}&events=div,split`;

  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Referer: 'https://finance.yahoo.com/' },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  if (!result) return null;
  const ts: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose ?? null;
  return {
    symbol,
    dates: ts.map((t) => new Date(t * 1000).toISOString().slice(0, 10)),
    open: quote.open ?? [],
    high: quote.high ?? [],
    low: quote.low ?? [],
    close: quote.close ?? [],
    adjclose: adj,
  };
}

// Our own clean EOD store (Neon `stock_eod`, sourced from official NSE bhavcopy).
// Symbols arrive suffixed (e.g. RELIANCE.NS); the table keys on the base symbol.
async function fetchFromDb(symbol: string): Promise<FullHistory | null> {
  const base = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ d: Date; o: number | null; h: number | null; l: number | null; c: number | null }>
    >(`SELECT d, o, h, l, c FROM stock_eod WHERE symbol = $1 ORDER BY d`, base);
    if (!rows || rows.length < 20) return null; // not in our store yet → caller falls back
    const full: FullHistory = {
      symbol, dates: [], open: [], high: [], low: [], close: [], adjclose: null,
    };
    for (const r of rows) {
      full.dates.push(r.d.toISOString().slice(0, 10));
      full.open.push(r.o ?? null);
      full.high.push(r.h ?? null);
      full.low.push(r.l ?? null);
      full.close.push(r.c ?? null);
    }
    return full;
  } catch {
    return null; // any DB issue → fall back to Yahoo, never break the build
  }
}

export async function GET(request: Request) {
  const rl = await enforceRateLimit({
    request,
    key: 'index-tools-history',
    maxRequests: 120,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') ?? '').trim();
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!symbol || !start || !end) {
    return NextResponse.json({ error: 'symbol, start and end are required' }, { status: 400 });
  }

  const cacheKey = `idxfull:${symbol}`;
  const cache = getRedis();

  // 1. Try the cached full history → slice → return (the common, fast path).
  if (cache) {
    try {
      const cached = (await cache.get(cacheKey)) as FullHistory | null;
      if (cached && cached.dates?.length) {
        return NextResponse.json(sliceRange(cached, start, end), { headers: { 'X-Cache': 'HIT' } });
      }
    } catch {
      /* ignore cache errors */
    }
  }

  // 2. Try our own clean EOD store (official NSE bhavcopy data). For library
  //    constituents this is the fast, reliable path — no Yahoo dependency.
  const fromDb = await fetchFromDb(symbol);
  if (fromDb) {
    if (cache) {
      try { await cache.set(cacheKey, fromDb, { ex: FULL_TTL_SECONDS }); } catch { /* ignore */ }
    }
    return NextResponse.json(sliceRange(fromDb, start, end), { headers: { 'X-Cache': 'DB' } });
  }

  // 3. Not in our store → fetch the full history once from Yahoo, cache it, then slice.
  try {
    const full = await fetchFullHistory(symbol);
    if (!full) {
      return NextResponse.json({ error: 'no data', symbol }, { status: 404 });
    }
    if (cache) {
      try {
        await cache.set(cacheKey, full, { ex: FULL_TTL_SECONDS });
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json(sliceRange(full, start, end), { headers: { 'X-Cache': 'MISS' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, symbol }, { status: 502 });
  }
}
