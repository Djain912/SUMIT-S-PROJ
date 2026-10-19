// Fetches long daily price history from Yahoo Finance (query1, no crumb) for
// the Market Desk universe. Long history (since ~2010) is what lets the
// insight engine say "first time since 2016" or "8 of the last 10 times".

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

// How a value should be written. Getting this wrong ("VIX $18") costs
// credibility, so every asset declares its unit explicitly.
export type Unit =
  | 'index-in'  // Indian index points, en-IN grouping: 22,889
  | 'index-us'  // US index points, en-US grouping: 7,659
  | 'usd'       // dollar price: $4,185 / $57.67
  | 'inr'       // rupee price: ₹94.92
  | 'level'     // plain level, no currency: VIX 18.4, DXY 101.8
  | 'yield'     // percent level: 4.21%
  | 'ratio';    // ratio: 72.6

export type Region = 'india' | 'global';

export type AssetMeta = {
  symbol: string;
  name: string;       // full display name
  short: string;      // compact name for charts/scoreboards
  unit: Unit;
  region: Region;
};

export type Series = AssetMeta & {
  dates: string[];    // YYYY-MM-DD, ascending
  closes: number[];
};

// Core universe — long history (2010+) is available for all of these.
export const CORE_ASSETS: AssetMeta[] = [
  { symbol: '^NSEI',      name: 'Nifty 50',          short: 'Nifty 50',     unit: 'index-in', region: 'india' },
  { symbol: '^NSEBANK',   name: 'Nifty Bank',        short: 'Bank Nifty',   unit: 'index-in', region: 'india' },
  { symbol: '^NSEMDCP50', name: 'Nifty Midcap 50',   short: 'Midcap 50',    unit: 'index-in', region: 'india' },
  { symbol: '^CNXIT',     name: 'Nifty IT',          short: 'Nifty IT',     unit: 'index-in', region: 'india' },
  { symbol: '^CNXPHARMA', name: 'Nifty Pharma',      short: 'Nifty Pharma', unit: 'index-in', region: 'india' },
  { symbol: '^INDIAVIX',  name: 'India VIX',         short: 'India VIX',    unit: 'level',    region: 'india' },
  { symbol: 'USDINR=X',   name: 'USD/INR',           short: 'USD/INR',      unit: 'inr',      region: 'india' },
  { symbol: '^GSPC',      name: 'S&P 500',           short: 'S&P 500',      unit: 'index-us', region: 'global' },
  { symbol: '^IXIC',      name: 'Nasdaq Composite',  short: 'Nasdaq',       unit: 'index-us', region: 'global' },
  { symbol: '^VIX',       name: 'VIX',               short: 'VIX',          unit: 'level',    region: 'global' },
  { symbol: '^TNX',       name: 'US 10-year yield',  short: 'US 10Y',       unit: 'yield',    region: 'global' },
  { symbol: 'DX-Y.NYB',   name: 'US Dollar Index',   short: 'DXY',          unit: 'level',    region: 'global' },
  { symbol: 'GC=F',       name: 'Gold',              short: 'Gold',         unit: 'usd',      region: 'global' },
  { symbol: 'SI=F',       name: 'Silver',            short: 'Silver',       unit: 'usd',      region: 'global' },
  { symbol: 'HG=F',       name: 'Copper',            short: 'Copper',       unit: 'usd',      region: 'global' },
  { symbol: 'BZ=F',       name: 'Brent crude',       short: 'Brent',        unit: 'usd',      region: 'global' },
  { symbol: 'BTC-USD',    name: 'Bitcoin',           short: 'Bitcoin',      unit: 'usd',      region: 'global' },
];

// Yahoo no longer serves history for most Nifty sector indices, so the
// sector scoreboard uses the NSE ETFs that track them (labelled as such).
export const SECTOR_ETFS: AssetMeta[] = [
  { symbol: 'BANKBEES.NS',   name: 'Bank',        short: 'Bank',        unit: 'inr', region: 'india' },
  { symbol: 'PSUBNKBEES.NS', name: 'PSU Bank',    short: 'PSU Bank',    unit: 'inr', region: 'india' },
  { symbol: 'ITBEES.NS',     name: 'IT',          short: 'IT',          unit: 'inr', region: 'india' },
  { symbol: 'AUTOBEES.NS',   name: 'Auto',        short: 'Auto',        unit: 'inr', region: 'india' },
  { symbol: 'PHARMABEES.NS', name: 'Pharma',      short: 'Pharma',      unit: 'inr', region: 'india' },
  { symbol: 'FMCGIETF.NS',   name: 'FMCG',        short: 'FMCG',        unit: 'inr', region: 'india' },
  { symbol: 'METALIETF.NS',  name: 'Metal',       short: 'Metal',       unit: 'inr', region: 'india' },
  { symbol: 'MOREALTY.NS',   name: 'Realty',      short: 'Realty',      unit: 'inr', region: 'india' },
  { symbol: 'INFRABEES.NS',  name: 'Infra',       short: 'Infra',       unit: 'inr', region: 'india' },
  { symbol: 'CPSEETF.NS',    name: 'CPSE',        short: 'CPSE',        unit: 'inr', region: 'india' },
  { symbol: 'CONSUMBEES.NS', name: 'Consumption', short: 'Consumption', unit: 'inr', region: 'india' },
  { symbol: 'OILIETF.NS',    name: 'Oil & Gas',   short: 'Oil & Gas',   unit: 'inr', region: 'india' },
];

async function fetchYahoo(symbol: string, years: number): Promise<{ dates: string[]; closes: number[] } | null> {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - Math.round(years * 365.25 * 86400);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${p1}&period2=${now + 86400}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Referer: 'https://finance.yahoo.com/' },
      cache: 'no-store',
    });
    if (!r.ok) {
      console.warn(`[market-desk] Yahoo ${symbol} HTTP ${r.status}`);
      return null;
    }
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp ?? [];
    const raw: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const dates: string[] = [];
    const closes: number[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = raw[i];
      if (c == null || !Number.isFinite(c) || c <= 0) continue;
      const d = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      // Yahoo occasionally repeats the live bar under the same date — keep the last.
      if (dates.length && dates[dates.length - 1] === d) {
        closes[closes.length - 1] = c;
        continue;
      }
      dates.push(d);
      closes.push(c);
    }
    return { dates, closes };
  } catch (e) {
    console.warn(`[market-desk] Yahoo ${symbol} fetch error:`, e);
    return null;
  }
}

async function fetchGroup(assets: AssetMeta[], years: number, minPoints: number): Promise<Series[]> {
  const settled = await Promise.allSettled(
    assets.map(async (a) => {
      const data = await fetchYahoo(a.symbol, years);
      if (!data || data.closes.length < minPoints) return null;
      return { ...a, ...data } satisfies Series;
    }),
  );
  return settled
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((v): v is Series => v !== null);
}

export type MarketData = { core: Series[]; sectors: Series[] };

export async function fetchMarketData(): Promise<MarketData> {
  const [core, sectors] = await Promise.all([
    fetchGroup(CORE_ASSETS, 16, 500),
    fetchGroup(SECTOR_ETFS, 1.2, 60),
  ]);
  console.log(`[market-desk] fetched core ${core.length}/${CORE_ASSETS.length}, sectors ${sectors.length}/${SECTOR_ETFS.length}`);
  return { core, sectors };
}
