// Fetches 1 year of daily price history from Yahoo Finance for a set of
// symbols and returns closes + computed stats (52w high/low, % change).

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Yahoo Finance requires a crumb + cookie from a consent/landing page visit.
// We fetch one crumb per generate run and reuse it across all symbol requests.
let _crumbCache: { crumb: string; cookie: string; ts: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  // Reuse for up to 10 minutes
  if (_crumbCache && Date.now() - _crumbCache.ts < 10 * 60 * 1000) {
    return { crumb: _crumbCache.crumb, cookie: _crumbCache.cookie };
  }
  try {
    // Step 1: hit the consent/landing page to get a cookie
    const consent = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      cache: 'no-store',
    });
    const rawCookie = consent.headers.get('set-cookie') ?? '';
    // Extract just the key=value pairs (strip attributes)
    const cookie = rawCookie
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    // Step 2: fetch the crumb using that cookie
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
      cache: 'no-store',
    });
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('<')) return null; // got HTML error page

    _crumbCache = { crumb, cookie, ts: Date.now() };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

export type PriceSeries = {
  symbol: string;
  name: string;
  currency: string;
  dates: string[];
  closes: number[];
  current: number;
  prev: number;          // yesterday's close
  pct1d: number;         // 1-day % change
  high52w: number;
  low52w: number;
  pctFromHigh: number;   // current vs 52w high
  pctFromLow: number;    // current vs 52w low
  isAtHigh52w: boolean;  // within 0.5% of 52w high
  isAtLow52w: boolean;
  pct1m: number;         // 1-month % change
  pct3m: number;
  pct6m: number;
  pct1y: number;
};

// Symbols to track. Yahoo Finance codes.
export const WATCH_SYMBOLS: { symbol: string; name: string; currency: string }[] = [
  { symbol: '^NSEI',    name: 'Nifty 50',         currency: 'INR' },
  { symbol: '^BSESN',   name: 'Sensex',            currency: 'INR' },
  { symbol: '^NSEBANK', name: 'Nifty Bank',        currency: 'INR' },
  { symbol: 'GC=F',     name: 'Gold (USD)',         currency: 'USD' },
  { symbol: 'SI=F',     name: 'Silver (USD)',       currency: 'USD' },
  { symbol: 'CL=F',     name: 'Crude Oil (WTI)',    currency: 'USD' },
  { symbol: '^GSPC',    name: 'S&P 500',            currency: 'USD' },
  { symbol: '^IXIC',    name: 'Nasdaq Composite',  currency: 'USD' },
  { symbol: '^DJI',     name: 'Dow Jones',          currency: 'USD' },
  { symbol: 'USDINR=X', name: 'USD/INR',            currency: 'INR' },
  { symbol: 'DX-Y.NYB', name: 'DXY (Dollar Index)', currency: 'USD' },
  { symbol: '^VIX',     name: 'VIX',                currency: 'USD' },
  { symbol: 'BTC-USD',  name: 'Bitcoin',            currency: 'USD' },
];

async function fetchYahoo(
  symbol: string,
  auth: { crumb: string; cookie: string } | null,
): Promise<{ dates: string[]; closes: number[] } | null> {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - 400 * 86400; // ~13 months back
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${p1}&period2=${now + 86400}&events=div${crumbParam}`;
  try {
    const headers: Record<string, string> = {
      'User-Agent': UA,
      Accept: 'application/json',
      Referer: 'https://finance.yahoo.com/',
    };
    if (auth?.cookie) headers['Cookie'] = auth.cookie;

    const r = await fetch(url, { headers, cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp ?? [];
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const dates: string[] = [];
    const closes: number[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = rawCloses[i];
      if (c == null || isNaN(c)) continue;
      dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
      closes.push(c);
    }
    return { dates, closes };
  } catch {
    return null;
  }
}

function pctChange(from: number, to: number) {
  return from === 0 ? 0 : ((to - from) / from) * 100;
}

function closeNDaysAgo(closes: number[], n: number) {
  return closes[Math.max(0, closes.length - 1 - n)] ?? closes[0];
}

export async function fetchAllSeries(): Promise<PriceSeries[]> {
  // Get crumb once — reused for all 13 symbol requests
  const auth = await getYahooCrumb();

  const results = await Promise.allSettled(
    WATCH_SYMBOLS.map(async ({ symbol, name, currency }) => {
      const data = await fetchYahoo(symbol, auth);
      if (!data || data.closes.length < 5) return null;
      const { dates, closes } = data;

      // Keep last 252 trading days (≈ 1 year) for high/low calc
      const yr = closes.slice(-252);
      const current = closes[closes.length - 1];
      const prev = closes[closes.length - 2] ?? current;
      const high52w = Math.max(...yr);
      const low52w = Math.min(...yr);

      return {
        symbol,
        name,
        currency,
        dates: dates.slice(-252),
        closes: yr,
        current,
        prev,
        pct1d: pctChange(prev, current),
        high52w,
        low52w,
        pctFromHigh: pctChange(high52w, current),
        pctFromLow: pctChange(low52w, current),
        isAtHigh52w: current >= high52w * 0.995,
        isAtLow52w: current <= low52w * 1.005,
        pct1m: pctChange(closeNDaysAgo(closes, 21), current),
        pct3m: pctChange(closeNDaysAgo(closes, 63), current),
        pct6m: pctChange(closeNDaysAgo(closes, 126), current),
        pct1y: pctChange(closeNDaysAgo(closes, 252), current),
      } satisfies PriceSeries;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PriceSeries | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is PriceSeries => v !== null);
}
