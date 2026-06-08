import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side proxy for Yahoo Finance daily price history.
// Browsers can't call Yahoo directly (CORS); this fetches it server-side
// and returns clean JSON. Results are cached in Redis to cut Yahoo calls.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

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

function toEpoch(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
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

  const cacheKey = `idxh:${symbol}:${start}:${end}`;
  const cache = getRedis();
  if (cache) {
    try {
      const hit = await cache.get(cacheKey);
      if (hit) return NextResponse.json(hit, { headers: { 'X-Cache': 'HIT' } });
    } catch {
      /* ignore cache errors */
    }
  }

  const p1 = toEpoch(start);
  const p2 = toEpoch(end) + 86_400; // inclusive of end date
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${p1}&period2=${p2}&events=div,split`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Referer: 'https://finance.yahoo.com/' },
      cache: 'no-store',
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Yahoo HTTP ${r.status} for ${symbol}`, symbol }, { status: 502 });
    }
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: 'no data', symbol }, { status: 404 });
    }
    const ts: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const adj = result.indicators?.adjclose?.[0]?.adjclose ?? null;
    const dates = ts.map((t) => new Date(t * 1000).toISOString().slice(0, 10));

    const payload = {
      symbol,
      dates,
      open: quote.open ?? [],
      high: quote.high ?? [],
      low: quote.low ?? [],
      close: quote.close ?? [],
      adjclose: adj,
    };

    if (cache) {
      try {
        await cache.set(cacheKey, payload, { ex: 60 * 60 * 6 }); // 6h
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, symbol }, { status: 502 });
  }
}
