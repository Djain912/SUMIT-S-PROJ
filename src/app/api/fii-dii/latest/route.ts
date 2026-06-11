import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side proxy for the official NSE FII/DII trading-activity API.
// The static dashboard at /fii-dii-app calls this first; if NSE blocks the
// server IP the dashboard still falls back to browser CORS proxies and then
// to its bundled archive, so a failure here is never fatal.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const NSE_HOME = 'https://www.nseindia.com/reports-indices-fii-dii-trading-activity';
const NSE_API = 'https://www.nseindia.com/api/fiidiiTradeReact';
// NSE publishes after market close; a short TTL keeps us fresh without hammering it.
const TTL_SECONDS = 60 * 30; // 30 min
const CACHE_KEY = 'fii-dii:latest';

type FiiDiiRow = {
  date: string;
  fii_buy: number;
  fii_sell: number;
  fii_net: number;
  dii_buy: number;
  dii_sell: number;
  dii_net: number;
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

async function fetchFromNse(): Promise<FiiDiiRow> {
  // NSE requires a session cookie obtained from a regular page hit first.
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: NSE_HOME,
  };

  const bootstrap = await fetch(NSE_HOME, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  const setCookies = bootstrap.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    headers.Cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  }

  const res = await fetch(NSE_API, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`NSE responded ${res.status}`);

  const raw = (await res.json()) as Array<{
    category?: string;
    date?: string;
    buyValue?: string | number;
    sellValue?: string | number;
    netValue?: string | number;
  }>;
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('NSE returned empty payload');

  const num = (v: string | number | undefined) => parseFloat(String(v ?? 0).replace(/,/g, '')) || 0;
  const row: FiiDiiRow = { date: '', fii_buy: 0, fii_sell: 0, fii_net: 0, dii_buy: 0, dii_sell: 0, dii_net: 0 };
  for (const r of raw) {
    const cat = (r.category ?? '').toUpperCase();
    if (cat.includes('FII') || cat.includes('FPI')) {
      row.fii_buy = num(r.buyValue);
      row.fii_sell = num(r.sellValue);
      row.fii_net = num(r.netValue);
      row.date = r.date ?? '';
    } else if (cat.includes('DII')) {
      row.dii_buy = num(r.buyValue);
      row.dii_sell = num(r.sellValue);
      row.dii_net = num(r.netValue);
    }
  }
  if (!row.date) throw new Error('NSE payload missing date');
  return row;
}

export async function GET() {
  const r = getRedis();
  try {
    if (r) {
      const cached = await r.get<FiiDiiRow>(CACHE_KEY);
      if (cached?.date) {
        return NextResponse.json(cached, { headers: { 'x-fii-dii-source': 'cache' } });
      }
    }

    const row = await fetchFromNse();
    if (r) await r.set(CACHE_KEY, row, { ex: TTL_SECONDS });
    return NextResponse.json(row, { headers: { 'x-fii-dii-source': 'nse' } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'fetch failed' },
      { status: 502 },
    );
  }
}

// The dashboard fires a POST "refresh" ping before reading; accept it quietly.
export async function POST() {
  return NextResponse.json({ ok: true });
}
