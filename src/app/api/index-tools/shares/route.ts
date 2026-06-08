import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side proxy for Yahoo Finance shares-outstanding (for market-cap weighting).
// Yahoo's quoteSummary endpoint needs a cookie + one-time crumb token; we fetch
// and cache those. If it fails, the UI lets the user type shares manually.

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

// Cached Yahoo auth (cookie + crumb), refreshed on demand.
const auth: { cookie: string | null; crumb: string | null } = { cookie: null, crumb: null };

function extractCookie(res: Response): string {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const list = typeof h.getSetCookie === 'function' ? h.getSetCookie() : [];
  const raw = list.length ? list : [res.headers.get('set-cookie') ?? ''];
  return raw
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function ensureAuth(force = false): Promise<void> {
  if (auth.cookie && auth.crumb && !force) return;
  // 1. Prime cookies
  try {
    const c = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, cache: 'no-store' });
    auth.cookie = extractCookie(c) || auth.cookie;
  } catch {
    /* ignore */
  }
  // 2. Fetch crumb using the cookie
  const rc = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Accept: 'text/plain', ...(auth.cookie ? { Cookie: auth.cookie } : {}) },
    cache: 'no-store',
  });
  auth.crumb = (await rc.text()).trim();
}

export async function GET(request: Request) {
  const rl = await enforceRateLimit({
    request,
    key: 'index-tools-shares',
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
  if (!symbol) return NextResponse.json({ error: 'symbol is required' }, { status: 400 });

  const cacheKey = `idxs:${symbol}`;
  const cache = getRedis();
  if (cache) {
    try {
      const hit = await cache.get(cacheKey);
      if (hit) return NextResponse.json(hit, { headers: { 'X-Cache': 'HIT' } });
    } catch {
      /* ignore */
    }
  }

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`;
  const fetchOnce = async () => {
    await ensureAuth();
    const u = `${url}?modules=defaultKeyStatistics,price&crumb=${encodeURIComponent(auth.crumb ?? '')}`;
    return fetch(u, {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(auth.cookie ? { Cookie: auth.cookie } : {}) },
      cache: 'no-store',
    });
  };

  try {
    let r = await fetchOnce();
    if (r.status === 401 || r.status === 403) {
      await ensureAuth(true); // crumb expired — refresh once
      r = await fetchOnce();
    }
    if (!r.ok) {
      return NextResponse.json({ error: `Yahoo HTTP ${r.status} for ${symbol}`, symbol }, { status: 502 });
    }
    const j = await r.json();
    const res = j?.quoteSummary?.result?.[0];
    const so = res?.defaultKeyStatistics?.sharesOutstanding?.raw;
    const name = res?.price?.shortName ?? res?.price?.longName ?? null;
    if (!so) {
      return NextResponse.json({ error: 'no shares data', symbol }, { status: 404 });
    }
    const payload = { symbol, sharesOutstanding: so, sharesCr: Math.round((so / 1e7) * 10000) / 10000, name };

    if (cache) {
      try {
        await cache.set(cacheKey, payload, { ex: 60 * 60 * 24 }); // 24h
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, symbol }, { status: 502 });
  }
}
