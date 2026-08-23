// Fetches 1 year of daily price history and returns closes + computed stats.
// Uses the same Yahoo Finance endpoint as the index builder (query1, no crumb).

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

export type PriceSeries = {
  symbol: string;
  name: string;
  currency: string;
  dates: string[];
  closes: number[];
  current: number;
  prev: number;
  pct1d: number;
  high52w: number;
  low52w: number;
  pctFromHigh: number;
  pctFromLow: number;
  isAtHigh52w: boolean;
  isAtLow52w: boolean;
  pct1m: number;
  pct3m: number;
  pct6m: number;
  pct1y: number;
};

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
): Promise<{ dates: string[]; closes: number[] } | null> {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - 400 * 86400;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${p1}&period2=${now + 86400}&events=div,split`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://finance.yahoo.com/',
      },
      cache: 'no-store',
    });
    if (!r.ok) {
      console.warn(`[observations] Yahoo ${symbol} HTTP ${r.status}`);
      return null;
    }
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
  } catch (e) {
    console.warn(`[observations] Yahoo ${symbol} fetch error:`, e);
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
  const results = await Promise.allSettled(
    WATCH_SYMBOLS.map(async ({ symbol, name, currency }) => {
      const data = await fetchYahoo(symbol);
      if (!data || data.closes.length < 5) return null;
      const { dates, closes } = data;

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

  const series = results
    .filter((r): r is PromiseFulfilledResult<PriceSeries | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is PriceSeries => v !== null);

  console.log(`[observations] fetched ${series.length}/${WATCH_SYMBOLS.length} symbols`);
  return series;
}
