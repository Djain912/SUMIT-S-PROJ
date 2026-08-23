// Weekly insight scanner — runs every Friday evening.
//
// Delivers 6–9 posts covering institutional positioning, sector performance,
// market breadth, and advance/decline data — content a macro analyst would
// actually want to post, not generic market recap.
//
// Run: node scripts/social/weekly-scan.mjs
// Automation: launchd fires this every Friday at 7:30 PM IST

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { deliverToTelegram } from './send-to-telegram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/) || line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(\S*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const prisma = new PrismaClient();

const SECTOR_SYMBOLS = [
  'NIFTY AUTO', 'NIFTY BANK', 'NIFTY CHEMICALS', 'NIFTY CONSUMER DURABLES',
  'NIFTY CONSUMER SERVICES', 'NIFTY FINANCIAL SERVICES', 'NIFTY FMCG',
  'NIFTY HEALTHCARE INDEX', 'NIFTY INDIA DEFENCE', 'NIFTY IT', 'NIFTY METAL',
  'NIFTY MIDSMALL HEALTHCARE', 'NIFTY MIDSMALL IT & TELECOM', 'NIFTY OIL & GAS',
  'NIFTY PHARMA', 'NIFTY POWER', 'NIFTY PRIVATE BANK', 'NIFTY PSU BANK',
  'NIFTY REALTY',
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function pct(n, d = 1) { return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; }
function crore(n) { return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`; }
function hashtagLine(tags) { return [...new Set(tags)].slice(0, 4).join(' '); }

// ── 1. Sector weekly performance ───────────────────────────────────────────
async function sectorWeeklyPerformance() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT symbol, d, c
    FROM stock_eod
    WHERE symbol = ANY($1::text[])
      AND d >= (SELECT MAX(d) FROM stock_eod) - INTERVAL '10 days'
    ORDER BY symbol, d ASC
  `, [...SECTOR_SYMBOLS, 'NIFTY 50']);

  const bySymbol = new Map();
  for (const r of rows) {
    if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, []);
    bySymbol.get(r.symbol).push(r);
  }

  const results = [];
  for (const symbol of [...SECTOR_SYMBOLS, 'NIFTY 50']) {
    const series = bySymbol.get(symbol);
    if (!series || series.length < 2) continue;
    // First and last of last 5 trading days
    const last5 = series.slice(-5);
    const weekOpen = Number(last5[0].c);  // Friday close of prior week (Mon open proxy)
    const weekClose = Number(last5[last5.length - 1].c);
    const weekPct = ((weekClose - weekOpen) / weekOpen) * 100;
    results.push({ symbol, weekPct, weekClose, weekOpen, lastDate: last5[last5.length - 1].d });
  }

  results.sort((a, b) => b.weekPct - a.weekPct);
  return results;
}

// ── 2. FII F&O weekly summary ──────────────────────────────────────────────
async function fnoWeeklySummary() {
  const rows = await prisma.fnoLog.findMany({ orderBy: { date: 'desc' }, take: 10 });
  if (rows.length < 2) return null;

  const thisWeek = rows[0];
  const lastWeek = rows[Math.min(4, rows.length - 1)]; // ~5 sessions ago

  const curIdxNet = Number(thisWeek.fiiIdxFutLong) - Number(thisWeek.fiiIdxFutShort);
  const prevIdxNet = Number(lastWeek.fiiIdxFutLong) - Number(lastWeek.fiiIdxFutShort);
  const idxNetChange = curIdxNet - prevIdxNet;

  const curStkNet = Number(thisWeek.fiiStkFutLong) - Number(thisWeek.fiiStkFutShort);
  const prevStkNet = Number(lastWeek.fiiStkFutLong) - Number(lastWeek.fiiStkFutShort);

  const curPCR = Number(thisWeek.fiiIdxCallLong) > 0
    ? Number(thisWeek.fiiIdxPutLong) / Number(thisWeek.fiiIdxCallLong) : null;
  const prevPCR = Number(lastWeek.fiiIdxCallLong) > 0
    ? Number(lastWeek.fiiIdxPutLong) / Number(lastWeek.fiiIdxCallLong) : null;

  const diiIdxNet = Number(thisWeek.diiIdxFutLong) - Number(thisWeek.diiIdxFutShort);

  return {
    date: thisWeek.date,
    prevDate: lastWeek.date,
    curIdxNet, prevIdxNet, idxNetChange,
    curStkNet, prevStkNet,
    curPCR, prevPCR,
    diiIdxNet,
    fiiIdxFutLong: Number(thisWeek.fiiIdxFutLong),
    fiiIdxFutShort: Number(thisWeek.fiiIdxFutShort),
    fiiStkFutLong: Number(thisWeek.fiiStkFutLong),
    fiiStkFutShort: Number(thisWeek.fiiStkFutShort),
    fiiIdxPutLong: Number(thisWeek.fiiIdxPutLong),
    fiiIdxCallLong: Number(thisWeek.fiiIdxCallLong),
    diiIdxFutLong: Number(thisWeek.diiIdxFutLong),
    diiIdxFutShort: Number(thisWeek.diiIdxFutShort),
  };
}

// ── 3. FII/DII cash weekly net ─────────────────────────────────────────────
async function cashWeeklySummary() {
  const rows = await prisma.fiiDiiLog.findMany({ orderBy: { date: 'desc' }, take: 7 });
  if (rows.length < 3) return null;

  const week = rows.slice(0, 5);
  const fiiTotal = week.reduce((s, r) => s + r.fiiNet, 0);
  const diiTotal = week.reduce((s, r) => s + r.diiNet, 0);
  const fiiDays = week.filter(r => r.fiiNet > 0).length;
  const diiDays = week.filter(r => r.diiNet > 0).length;
  const lastDate = rows[0].date;

  return { fiiTotal, diiTotal, fiiDays, diiDays, sessions: week.length, lastDate };
}

// ── 4. Market breadth — % above MA, advance/decline ───────────────────────
async function marketBreadth() {
  // Fetch last 210 days of all non-index stocks for MA computation
  const rows = await prisma.$queryRawUnsafe(`
    SELECT symbol, d, c
    FROM stock_eod
    WHERE symbol NOT LIKE 'NIFTY%'
      AND symbol != 'SENSEX'
      AND d >= (SELECT MAX(d) FROM stock_eod) - INTERVAL '400 days'
    ORDER BY symbol, d ASC
  `);

  const bySymbol = new Map();
  for (const r of rows) {
    if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, []);
    bySymbol.get(r.symbol).push(Number(r.c));
  }

  let above20 = 0, above50 = 0, above200 = 0, total = 0;
  let advances = 0, declines = 0, unchanged = 0;

  // Also compute weekly A/D
  const rowsBySymbolFull = new Map();
  for (const r of rows) {
    if (!rowsBySymbolFull.has(r.symbol)) rowsBySymbolFull.set(r.symbol, []);
    rowsBySymbolFull.get(r.symbol).push({ d: r.d, c: Number(r.c) });
  }

  let weeklyAdvances = 0, weeklyDeclines = 0;

  for (const [symbol, closes] of bySymbol) {
    if (closes.length < 5) continue;
    total++;
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];

    // Daily A/D
    if (last > prev) advances++;
    else if (last < prev) declines++;
    else unchanged++;

    // MA checks
    if (closes.length >= 20) {
      const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      if (last > ma20) above20++;
    }
    if (closes.length >= 50) {
      const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
      if (last > ma50) above50++;
    }
    if (closes.length >= 200) {
      const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
      if (last > ma200) above200++;
    }

    // Weekly A/D (5 sessions)
    const fullSeries = rowsBySymbolFull.get(symbol) ?? [];
    if (fullSeries.length >= 5) {
      const weekClose = fullSeries[fullSeries.length - 1].c;
      const weekStart = fullSeries[fullSeries.length - 5].c;
      if (weekClose > weekStart) weeklyAdvances++;
      else if (weekClose < weekStart) weeklyDeclines++;
    }
  }

  const pctAbove20 = (above20 / total) * 100;
  const pctAbove50 = (above50 / total) * 100;
  const pctAbove200 = (above200 / total) * 100;
  const adRatio = declines > 0 ? advances / declines : advances;
  const weeklyAdRatio = weeklyDeclines > 0 ? weeklyAdvances / weeklyDeclines : weeklyAdvances;

  return {
    total, advances, declines, unchanged,
    pctAbove20, pctAbove50, pctAbove200,
    adRatio, weeklyAdvances, weeklyDeclines, weeklyAdRatio,
  };
}

// ── 5. Sectoral breadth — % of stocks in each sector above 50-MA ──────────
async function sectoralBreadth() {
  // Map sector index names to stock-level data via NSE sector membership
  // We approximate by checking which stocks are in stock_eod and grouping
  // by known sector — this is a best-effort using the data we have.
  // True sectoral breadth needs NSE sector membership data, so we use
  // the broad breadth split by index performance proxy instead.

  // Fetch the Nifty 500 universe performance for the week
  const rows = await prisma.$queryRawUnsafe(`
    SELECT symbol, d, c
    FROM stock_eod
    WHERE symbol NOT LIKE 'NIFTY%'
      AND symbol != 'SENSEX'
      AND d >= (SELECT MAX(d) FROM stock_eod) - INTERVAL '60 days'
    ORDER BY symbol, d ASC
  `);

  const bySymbol = new Map();
  for (const r of rows) {
    if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, []);
    bySymbol.get(r.symbol).push(Number(r.c));
  }

  // Bucket stocks by weekly performance into deciles
  const weeklyReturns = [];
  for (const [symbol, closes] of bySymbol) {
    if (closes.length < 5) continue;
    const weekPct = ((closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5]) * 100;
    weeklyReturns.push({ symbol, weekPct });
  }

  weeklyReturns.sort((a, b) => b.weekPct - a.weekPct);
  const top10 = weeklyReturns.slice(0, 10);
  const bottom10 = weeklyReturns.slice(-10);

  return { top10, bottom10, total: weeklyReturns.length };
}

// ── Build caption text for each post ──────────────────────────────────────
function buildSectorPost(sectorData, dateLabel) {
  const nifty = sectorData.find(s => s.symbol === 'NIFTY 50');
  const sectors = sectorData.filter(s => s.symbol !== 'NIFTY 50');
  const top3 = sectors.slice(0, 3);
  const bot3 = sectors.slice(-3).reverse();

  const niftyLine = nifty ? `Nifty 50: ${pct(nifty.weekPct)}` : '';
  const topLines = top3.map(s => `${s.symbol.replace('NIFTY ', '')}  ${pct(s.weekPct)}`).join('\n');
  const botLines = bot3.map(s => `${s.symbol.replace('NIFTY ', '')}  ${pct(s.weekPct)}`).join('\n');
  const spread = sectors.length >= 2 ? Math.abs(sectors[0].weekPct - sectors[sectors.length - 1].weekPct) : 0;

  const rotationRead = spread > 5
    ? `Spread of ${spread.toFixed(1)}% between the top and bottom sector signals active rotation — money is moving with conviction, not just drifting.`
    : spread > 2
    ? `A ${spread.toFixed(1)}% spread between leaders and laggards suggests moderate rotation. Not every sector is moving together.`
    : `Tight ${spread.toFixed(1)}% spread across sectors — the market moved broadly this week with little differentiation. Watch next week for rotation to emerge.`;

  const headline = `Week in review (${dateLabel}) — Sector performance`;
  const detail = `${niftyLine}\n\nLeaders:\n${topLines}\n\nLaggards:\n${botLines}`;
  const implication = rotationRead;

  return { category: 'Weekly: Sector Performance', headline, detail, implication,
    tags: '#SectorPerformance #NiftyIndia #SectorRotation #WeeklyWrap', score: 80 };
}

function buildFnoPost(fno, dateLabel) {
  const idxDirection = fno.curIdxNet < 0 ? 'net short' : 'net long';
  const idxChange = fno.idxNetChange;
  const added = idxChange < 0 ? 'added' : 'reduced';
  const changeAbs = Math.abs(idxChange);
  const pcrDir = fno.curPCR && fno.prevPCR
    ? fno.curPCR > fno.prevPCR ? 'rose' : 'fell'
    : null;

  const diiSide = fno.diiIdxNet > 0 ? 'net long' : 'net short';
  const diverge = (fno.curIdxNet < 0 && fno.diiIdxNet > 0) || (fno.curIdxNet > 0 && fno.diiIdxNet < 0);

  const headline = `FII F&O weekly wrap (${dateLabel}): index futures ${idxDirection} at ${Math.abs(fno.curIdxNet).toLocaleString('en-IN')} contracts`;

  const detail = [
    `FII index futures net: ${fno.curIdxNet.toLocaleString('en-IN')} contracts (${idxDirection})`,
    `Week-over-week change: ${idxChange > 0 ? '+' : ''}${idxChange.toLocaleString('en-IN')} contracts (FIIs ${added} ${changeAbs.toLocaleString('en-IN')} shorts)`,
    `FII stock futures net: ${fno.curStkNet.toLocaleString('en-IN')} contracts`,
    fno.curPCR ? `FII Put/Call ratio: ${fno.curPCR.toFixed(2)}${pcrDir && fno.prevPCR ? ` (${pcrDir} from ${fno.prevPCR.toFixed(2)} last week)` : ''}` : '',
    `DII index futures net: ${fno.diiIdxNet.toLocaleString('en-IN')} contracts (${diiSide})`,
  ].filter(Boolean).join('\n');

  const implication = diverge
    ? `FII and DII are on opposite sides of the index futures market this week — FII ${idxDirection}, DII ${diiSide}. This is a genuine tug-of-war in derivatives. Historically, when these two camps are positioned against each other, the resolution (one side capitulating) tends to be a sharp directional move. The side that blinks first determines the next swing.`
    : fno.curIdxNet < -100000
    ? `FII index futures net short position is substantial at ${Math.abs(fno.curIdxNet).toLocaleString('en-IN')} contracts. This is a large hedged book — it doesn't necessarily mean FIIs are bearish on India fundamentally, but it does mean any surprise positive catalyst could trigger aggressive short-covering. Watch for that setup.`
    : `FII positioning in index futures remains ${idxDirection} heading into next week. The PCR of ${fno.curPCR?.toFixed(2) ?? 'n/a'} suggests ${(fno.curPCR ?? 1) > 1.5 ? 'elevated hedging — more puts than calls' : 'balanced options positioning with no strong directional hedge'}.`;

  return { category: 'Weekly: F&O Positioning', headline, detail, implication,
    tags: '#FII #FnO #NiftyFutures #WeeklyWrap', score: 85 };
}

function buildCashPost(cash, dateLabel) {
  const fiiDir = cash.fiiTotal >= 0 ? 'net buyers' : 'net sellers';
  const diiDir = cash.diiTotal >= 0 ? 'net buyers' : 'net sellers';
  const diverge = (cash.fiiTotal < 0 && cash.diiTotal > 0) || (cash.fiiTotal > 0 && cash.diiTotal < 0);

  const headline = `FII/DII cash flows this week: FII ${crore(cash.fiiTotal)} net, DII ${crore(cash.diiTotal)} net`;

  const detail = [
    `FII: ${crore(cash.fiiTotal)} (${fiiDir} on ${cash.fiiDays}/${cash.sessions} sessions)`,
    `DII: ${crore(cash.diiTotal)} (${diiDir} on ${cash.diiDays}/${cash.sessions} sessions)`,
    `Combined: ${crore(cash.fiiTotal + cash.diiTotal)} net for the week`,
  ].join('\n');

  const implication = diverge
    ? `Classic FII vs DII divergence in cash this week — foreign money ${cash.fiiTotal < 0 ? 'selling' : 'buying'} while domestic institutions ${cash.diiTotal > 0 ? 'absorb' : 'reduce exposure'}. DII has been the steady hand in India's market over the last few years. The ${cash.diiTotal > 0 ? 'DII buying is providing a floor' : 'DII selling alongside FII selling is meaningful — worth watching broader market support levels'}.`
    : cash.fiiTotal > 0
    ? `Both FII and DII were net buyers this week — ${crore(cash.fiiTotal + cash.diiTotal)} combined inflow. Dual-sided buying is the cleanest demand signal: foreign flows bring the money, domestic flows bring conviction.`
    : `Both FII and DII net sellers this week — combined outflow of ${crore(Math.abs(cash.fiiTotal + cash.diiTotal))}. When both camps are selling simultaneously, there is no natural buyer stepping in. These weeks historically coincide with index underperformance vs global peers.`;

  return { category: 'Weekly: FII/DII Cash', headline, detail, implication,
    tags: '#FII #DII #FIIFlows #WeeklyWrap', score: 78 };
}

function buildBreadthPost(breadth, dateLabel) {
  const { pctAbove20, pctAbove50, pctAbove200, adRatio, weeklyAdRatio,
          weeklyAdvances, weeklyDeclines, total } = breadth;

  // Interpret the readings
  const ma200Read = pctAbove200 > 75 ? 'Bullish — most stocks in long-term uptrends'
    : pctAbove200 > 55 ? 'Neutral-to-bullish — broad market healthy, majority above long-term average'
    : pctAbove200 > 40 ? 'Mixed — market is split; selective approach warranted'
    : pctAbove200 > 25 ? 'Weak — majority of stocks in long-term downtrends. Distribution ongoing.'
    : 'Bearish extreme — fewer than 25% of stocks above 200-MA. Washout conditions.';

  const ma50Read = pctAbove50 > 70 ? 'strong breadth — momentum broad-based'
    : pctAbove50 > 50 ? 'moderate breadth — more bulls than bears in the intermediate trend'
    : pctAbove50 > 35 ? 'deteriorating — more than half of stocks below 50-MA'
    : 'weak — breadth has broken down';

  const weeklyAdStr = weeklyDeclines > 0
    ? `${(weeklyAdvances / weeklyDeclines).toFixed(1)}:1`
    : `${weeklyAdvances}:0`;

  const headline = `Market breadth snapshot — ${total} stocks: ${pctAbove200.toFixed(0)}% above 200-MA, ${pctAbove50.toFixed(0)}% above 50-MA`;

  const detail = [
    `% above 200-day MA: ${pctAbove200.toFixed(1)}% (${above200description(pctAbove200)})`,
    `% above 50-day MA: ${pctAbove50.toFixed(1)}%`,
    `% above 20-day MA: ${pctAbove20.toFixed(1)}%`,
    `Weekly A/D ratio: ${weeklyAdStr} (${weeklyAdvances} stocks up vs ${weeklyDeclines} down for the week)`,
  ].join('\n');

  const implication = `${ma200Read} ${pctAbove200.toFixed(0)}% of the NSE universe is above its long-term average — that's the most important single breadth number. The 50-MA at ${pctAbove50.toFixed(0)}% shows ${ma50Read}. When these two numbers diverge widely, it typically signals either a broad recovery beginning (50-MA improving faster than 200-MA) or a market that has already peaked in the leaders and is quietly rolling over in the broader names.`;

  return { category: 'Weekly: Market Breadth', headline, detail, implication,
    tags: '#MarketBreadth #AdvanceDecline #NiftyIndia #BreadthIndicators', score: 82 };
}

function above200description(pct) {
  if (pct > 75) return 'bullish extreme';
  if (pct > 55) return 'healthy';
  if (pct > 40) return 'mixed';
  if (pct > 25) return 'weak';
  return 'washed out';
}

function buildTopStocksPost(sectoralData, dateLabel) {
  const { top10, bottom10, total } = sectoralData;
  const topLines = top10.slice(0, 5).map(s => `${s.symbol}  ${pct(s.weekPct)}`).join('\n');
  const botLines = bottom10.slice(0, 5).map(s => `${s.symbol}  ${pct(s.weekPct)}`).join('\n');

  const headline = `Week's biggest movers across ${total} stocks`;
  const detail = `Top gainers:\n${topLines}\n\nBiggest declines:\n${botLines}`;
  const implication = `The spread between this week's top gainers and biggest losers tells you about the risk environment. Large weekly moves on both ends suggest active stock-picking is being rewarded — the market is differentiating, not just moving everything in one direction. These are your candidate watchlist names for the following week.`;

  return { category: 'Weekly: Stock Movers', headline, detail, implication,
    tags: '#StockMarket #WeeklyWrap #NSE #StockPicking', score: 65 };
}

function buildFnoBreadthPost(fno) {
  // FII options positioning — are they buying calls or puts more?
  const callNet = fno.fiiIdxCallLong - Number(fno.fiiIdxCallShort ?? 0);
  // wait — we need call short from the row
  // We have: fiiIdxCallLong, fiiIdxPutLong, fiiIdxPutShort from the row
  const putBuyBias = fno.curPCR > 1.0;
  const strongBias = fno.curPCR > 1.8 || fno.curPCR < 0.6;

  const headline = `FII options positioning: Put/Call ratio at ${fno.curPCR?.toFixed(2) ?? 'n/a'} — FIIs holding ${fno.fiiIdxPutLong.toLocaleString('en-IN')} index puts vs ${fno.fiiIdxCallLong.toLocaleString('en-IN')} calls`;

  const detail = [
    `FII index put OI (long): ${fno.fiiIdxPutLong.toLocaleString('en-IN')} contracts`,
    `FII index call OI (long): ${fno.fiiIdxCallLong.toLocaleString('en-IN')} contracts`,
    `FII Put/Call ratio: ${fno.curPCR?.toFixed(2) ?? 'n/a'}`,
    `Interpretation: FIIs are buying ${fno.curPCR > 1 ? 'more puts than calls' : 'more calls than puts'}`,
  ].join('\n');

  const implication = fno.curPCR > 1.5
    ? `A PCR above 1.5 means FIIs are holding substantially more index puts than calls — that is hedging, not speculation. When the world's most sophisticated derivatives traders load up on puts, they're either protecting large long equity positions or making a directional downside bet. At ${fno.curPCR?.toFixed(2)}, this is meaningful protection. It also means if the market moves up sharply, these puts decay fast — watch for a potential short-squeeze catalyst.`
    : fno.curPCR < 0.8
    ? `A PCR below 0.8 means FIIs are holding more calls than puts on the index — net bullish options positioning. When the hedge ratio is this low, FIIs aren't buying much protection. They either see limited downside risk, or they're positioned for upside. This is a constructive read for Nifty.`
    : `FII put/call ratio of ${fno.curPCR?.toFixed(2)} is in the neutral zone — neither aggressively hedged nor fully unhedged. No strong directional signal from options positioning alone this week.`;

  return { category: 'Weekly: F&O Positioning', headline, detail, implication,
    tags: '#FII #PCR #PutCallRatio #NiftyOptions', score: 75 };
}

// ── Infographic renderer ───────────────────────────────────────────────────
function renderInfographic(outDir, name, chartData) {
  const dataPath = path.join(outDir, `${name}_data.json`);
  const pngPath  = path.join(outDir, `${name}.png`);
  fs.writeFileSync(dataPath, JSON.stringify(chartData));
  try {
    execFileSync('python3', [path.join(__dirname, 'render_infographic.py'), dataPath, pngPath],
      { stdio: 'inherit' });
    return pngPath;
  } catch (e) {
    console.error(`Infographic render failed [${name}]:`, e.message);
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Running weekly scan...');

  const [sectorData, fno, cash, breadth, sectoralData] = await Promise.all([
    sectorWeeklyPerformance(),
    fnoWeeklySummary(),
    cashWeeklySummary(),
    marketBreadth(),
    sectoralBreadth(),
  ]);

  // Fetch FnoLog history for PCR chart
  const fnoHistory = await prisma.fnoLog.findMany({ orderBy: { date: 'desc' }, take: 20 });
  const fiiDiiHistory = await prisma.fiiDiiLog.findMany({ orderBy: { date: 'desc' }, take: 7 });

  const latestDate = sectorData[0]?.lastDate ?? new Date();
  const dateLabel = fmtDate(latestDate);
  const todayStr = new Date(latestDate).toISOString().slice(0, 10);

  const outDir = path.join(__dirname, 'output', `weekly-${todayStr}`);
  fs.mkdirSync(outDir, { recursive: true });

  // ── Build findings with infographic data ──────────────────────────────
  const findings = [];

  // 1. Sector performance — horizontal bar chart
  if (sectorData.length > 5) {
    const post = buildSectorPost(sectorData, dateLabel);
    const nifty = sectorData.find(s => s.symbol === 'NIFTY 50');
    const sectors = sectorData.filter(s => s.symbol !== 'NIFTY 50');
    const chartData = {
      type: 'sector_weekly',
      date: dateLabel,
      nifty_pct: nifty?.weekPct ?? 0,
      sectors: sectors.map(s => ({
        label: s.symbol.replace('NIFTY ', ''),
        pct: s.weekPct,
      })),
    };
    const imgPath = renderInfographic(outDir, 'sector_weekly', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // 2. Market breadth — gauge visual
  if (breadth) {
    const post = buildBreadthPost(breadth, dateLabel);
    const chartData = {
      type: 'breadth_snapshot',
      date: dateLabel,
      total: breadth.total,
      pct_above_20: breadth.pctAbove20,
      pct_above_50: breadth.pctAbove50,
      pct_above_200: breadth.pctAbove200,
      advances: breadth.advances,
      declines: breadth.declines,
      unchanged: breadth.unchanged,
      weekly_advances: breadth.weeklyAdvances,
      weekly_declines: breadth.weeklyDeclines,
    };
    const imgPath = renderInfographic(outDir, 'breadth_snapshot', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // 3. FII F&O positioning scorecard
  if (fno) {
    const post = buildFnoPost(fno, dateLabel);
    const idxNetChg = fno.idxNetChange;
    const chartData = {
      type: 'fno_positioning',
      date: fno.date,
      rows: [
        {
          label: 'FII Index Futures (Net)',
          value: `${fno.curIdxNet.toLocaleString('en-IN')} contracts`,
          change: `${idxNetChg > 0 ? '+' : ''}${idxNetChg.toLocaleString('en-IN')}`,
          colour: fno.curIdxNet >= 0 ? '#26A65B' : '#E74C3C',
          signal: fno.curIdxNet >= 0 ? 'Bullish' : 'Bearish',
        },
        {
          label: 'FII Stock Futures (Net)',
          value: `${fno.curStkNet.toLocaleString('en-IN')} contracts`,
          change: `${(fno.curStkNet - fno.prevStkNet) > 0 ? '+' : ''}${(fno.curStkNet - fno.prevStkNet).toLocaleString('en-IN')}`,
          colour: fno.curStkNet >= 0 ? '#26A65B' : '#E74C3C',
          signal: fno.curStkNet >= 0 ? 'Long' : 'Short',
        },
        {
          label: 'FII Index Put OI (Long)',
          value: `${fno.fiiIdxPutLong.toLocaleString('en-IN')}`,
          change: '',
          colour: '#E74C3C',
          signal: 'Hedge',
        },
        {
          label: 'FII Index Call OI (Long)',
          value: `${fno.fiiIdxCallLong.toLocaleString('en-IN')}`,
          change: '',
          colour: '#26A65B',
          signal: 'Bullish bet',
        },
        {
          label: 'FII Put/Call Ratio',
          value: fno.curPCR ? fno.curPCR.toFixed(2) : '—',
          change: fno.prevPCR ? `prev: ${fno.prevPCR.toFixed(2)}` : '',
          colour: fno.curPCR > 1.5 ? '#E74C3C' : fno.curPCR < 0.8 ? '#26A65B' : '#4A90D9',
          signal: fno.curPCR > 1.5 ? 'Bearish hedge' : fno.curPCR < 0.8 ? 'Bullish' : 'Neutral',
        },
        {
          label: 'DII Index Futures (Net)',
          value: `${fno.diiIdxNet.toLocaleString('en-IN')} contracts`,
          change: '',
          colour: fno.diiIdxNet >= 0 ? '#4A90D9' : '#F5A623',
          signal: fno.diiIdxNet >= 0 ? 'Long' : 'Short',
        },
      ],
    };
    const imgPath = renderInfographic(outDir, 'fno_positioning', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // 4. FII PCR history chart
  if (fno && fno.curPCR) {
    const post = buildFnoBreadthPost(fno);
    const pcrHistory = fnoHistory
      .filter(r => Number(r.fiiIdxCallLong) > 0)
      .map(r => ({
        date: r.date.replace(/(\d+)-(\w+)-(\d+)/, '$1 $2'),
        pcr: Number(r.fiiIdxPutLong) / Number(r.fiiIdxCallLong),
      }))
      .reverse();
    const chartData = {
      type: 'fno_pcr',
      date: fno.date,
      pcr: fno.curPCR,
      prev_pcr: fno.prevPCR,
      put_oi: fno.fiiIdxPutLong,
      call_oi: fno.fiiIdxCallLong,
      history: pcrHistory,
    };
    const imgPath = renderInfographic(outDir, 'fno_pcr', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // 5. FII/DII cash flows bar chart
  if (cash) {
    const post = buildCashPost(cash, dateLabel);
    const days = fiiDiiHistory.slice(0, 5).reverse().map(r => ({
      date: r.date.split('-').slice(1).join(' '),  // "Aug 17" format
      fii: r.fiiNet,
      dii: r.diiNet,
    }));
    const chartData = {
      type: 'cash_flows',
      date: dateLabel,
      fii_total: cash.fiiTotal,
      dii_total: cash.diiTotal,
      days,
    };
    const imgPath = renderInfographic(outDir, 'cash_flows', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // 6. Top / bottom movers
  if (sectoralData) {
    const post = buildTopStocksPost(sectoralData, dateLabel);
    const chartData = {
      type: 'top_movers',
      date: dateLabel,
      total: sectoralData.total,
      top: sectoralData.top10.slice(0, 7).map(s => ({ symbol: s.symbol, pct: s.weekPct })),
      bottom: sectoralData.bottom10.slice(0, 7).map(s => ({ symbol: s.symbol, pct: s.weekPct })),
    };
    const imgPath = renderInfographic(outDir, 'top_movers', chartData);
    findings.push({ ...post, _imgPath: imgPath });
  }

  // Sort by score
  findings.sort((a, b) => b.score - a.score);

  // Save findings JSON (for Telegram delivery)
  const findingsJson = findings.map((f, i) => ({
    category: f.category,
    score: f.score,
    headline: f.headline,
    stat: f.stat ?? '',
    detail: f.detail,
    implication: f.implication,
    hasChart: !!f._imgPath,
    tags: f.tags,
    // Store image path under chart_N convention used by send-to-telegram
    _imgPath: f._imgPath,
  }));

  // Rename image files to chart_1.png, chart_2.png, etc for telegram delivery
  for (let i = 0; i < findingsJson.length; i++) {
    const f = findingsJson[i];
    if (f._imgPath && fs.existsSync(f._imgPath)) {
      const dest = path.join(outDir, `chart_${i + 1}.png`);
      fs.copyFileSync(f._imgPath, dest);
    }
    delete f._imgPath;
  }

  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(findingsJson, null, 2));

  // Build report
  let report = `# Chartix Weekly Scan — ${dateLabel}\n\n${findings.length} posts with infographics.\n\n---\n\n`;
  findings.forEach((f, i) => {
    report += `## ${i + 1}. [${f.category}]\n\n**${f.headline}**\n\n${f.detail}\n\n*${f.implication}*\n\n${f.tags}\n\n---\n\n`;
  });
  fs.writeFileSync(path.join(outDir, 'report.md'), report);

  console.log('\n' + '='.repeat(60));
  console.log(`Weekly scan done — ${findings.length} infographic posts`);
  console.log('Output:', outDir);
  console.log('='.repeat(60) + '\n');

  if (process.env.SKIP_TELEGRAM === '1') {
    console.log('SKIP_TELEGRAM=1 — not delivering.');
    await prisma.$disconnect();
    return;
  }

  console.log('Delivering to Telegram...');
  await deliverToTelegram(outDir, `Weekly — ${dateLabel}`, findingsJson);
  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
