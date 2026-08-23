// Daily insight scanner — macro/intermarket + India equity.
//
// Philosophy: post only what is RARE and MEANINGFUL.
//   - 3-year extremes only (756 sessions), not 52-week
//   - Fresh breakouts only — fires once when a level is first hit, not
//     every day the market grinds at that level
//   - 21-day cooldown per symbol so nothing repeats within a month
//   - FII/DII only on statistical extremes (z-score > 1.5 vs 60-day baseline)
//   - Sector RS on MA crossovers, not just "at high" (crossover = trend change)
//   - Intermarket relationships (Copper/Gold, Brent MA) over plain price facts
//   - 4 posts max per day, 1 per category
//
// Run: node scripts/social/daily-insight-scan.mjs

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { deliverToTelegram } from './send-to-telegram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually — ESM scripts don't get Next.js / dotenv auto-loading
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

const BROAD_INDEX_SYMBOLS = ['NIFTY 50', 'SENSEX'];
const SECTOR_SYMBOLS = [
  'NIFTY AUTO', 'NIFTY BANK', 'NIFTY CHEMICALS', 'NIFTY CONSUMER DURABLES',
  'NIFTY CONSUMER SERVICES', 'NIFTY FINANCIAL SERVICES', 'NIFTY FMCG',
  'NIFTY HEALTHCARE INDEX', 'NIFTY INDIA DEFENCE', 'NIFTY IT', 'NIFTY METAL',
  'NIFTY MIDSMALL HEALTHCARE', 'NIFTY MIDSMALL IT & TELECOM', 'NIFTY OIL & GAS',
  'NIFTY PHARMA', 'NIFTY POWER', 'NIFTY PRIVATE BANK', 'NIFTY PSU BANK',
  'NIFTY REALTY',
];
const ALL_INDEX_SYMBOLS = new Set([...BROAD_INDEX_SYMBOLS, ...SECTOR_SYMBOLS]);

const MAX_FINDINGS = 10;
const MAX_PER_CATEGORY = 2;
const COOLDOWN_DAYS = 21;
const EXTREME_WINDOW = 756; // ~3 trading years
const FII_ZSCORE_THRESHOLD = 1.5;
const FII_BASELINE_SESSIONS = 60;
const RS_MA_PERIOD = 50;
const RS_CROSS_MIN_GAP = 20; // minimum sessions since last RS MA crossover to count as fresh

// ── Cooldown cache ─────────────────────────────────────────────────────────
// Keyed by `category:symbol_or_id` → ISO date of last report.
// Nothing gets posted twice within COOLDOWN_DAYS — eliminates the "same
// index at 52-week high again" problem that makes daily posts repetitive.
const COOLDOWN_PATH = path.join(__dirname, 'state', 'seen_findings.json');

function loadCooldowns() {
  try { return JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf-8')); }
  catch { return {}; }
}
function saveCooldowns(c) {
  fs.mkdirSync(path.dirname(COOLDOWN_PATH), { recursive: true });
  fs.writeFileSync(COOLDOWN_PATH, JSON.stringify(c, null, 2));
}
function isOnCooldown(cooldowns, key, todayStr) {
  const last = cooldowns[key];
  if (!last) return false;
  return (new Date(todayStr) - new Date(last)) / 86400000 < COOLDOWN_DAYS;
}

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function crore(n) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}
function pct(n, digits = 1) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

// ── Hashtags ───────────────────────────────────────────────────────────────
function pascal(s) {
  return s.replace(/&/g, ' ').split(/[\s/]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}
function indexTag(symbol) { return '#' + pascal(symbol); }
function tickerTag(symbol) { return '#' + symbol.replace(/[^A-Za-z0-9]/g, ''); }
function nameTag(name) { return '#' + name.replace(/[^A-Za-z0-9]/g, ''); }
function hashtagLine(tags) { return [...new Set(tags)].slice(0, 4).join(' '); }

// ── FII/DII — statistical extreme only ────────────────────────────────────
// Only fires when today's flow is more than 1.5 standard deviations from the
// 60-session mean — an actual anomaly, not just "biggest in last 90 days"
// which fires routinely in quiet markets.
async function fetchFiiDii() {
  return prisma.fiiDiiLog.findMany({ orderBy: { date: 'desc' }, take: 250 });
}

function zScore(value, values) {
  if (values.length < 10) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return std === 0 ? 0 : (value - mean) / std;
}

function fiiDiiBarChart(rowsDesc, key, label, n, highlightCount) {
  const windowDesc = rowsDesc.slice(0, n);
  const rows = [...windowDesc].reverse().map((r) => ({ date: r.date, value: r[key] }));
  const highlightIndices = [];
  for (let i = rows.length - highlightCount; i < rows.length; i++) {
    if (i >= 0) highlightIndices.push(i);
  }
  return { type: 'bar_flow', title: `${label} Net Flow — Last ${rows.length} Sessions`, rows, highlightIndices };
}

function analyzeFiiDii(rowsDesc, cooldowns, todayStr) {
  const findings = [];
  if (rowsDesc.length < FII_BASELINE_SESSIONS + 5) return findings;
  const latestDate = rowsDesc[0].date;

  for (const [label, key] of [['FII', 'fiiNet'], ['DII', 'diiNet']]) {
    const baseline = rowsDesc.slice(1, FII_BASELINE_SESSIONS + 1).map((r) => r[key]);
    const todayVal = rowsDesc[0][key];
    const z = zScore(todayVal, baseline);

    if (Math.abs(z) >= FII_ZSCORE_THRESHOLD) {
      const cooldownKey = `FII/DII:${label}_single`;
      if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

      const direction = todayVal >= 0 ? 'bought' : 'sold';
      const sign = todayVal >= 0 ? 'net buy' : 'net sell';
      const strength = Math.abs(z) > 2.5 ? 'extreme' : 'notable';

      const chart = fiiDiiBarChart(rowsDesc, key, label, 40, 1);
      chart.title = `${label} Net Flow — ${crore(todayVal)} on ${fmtDate(latestDate)}`;

      // Implication context based on direction
      const implication = label === 'FII'
        ? (todayVal >= 0
          ? 'Large FII inflows at this magnitude typically coincide with INR strength and Nifty follow-through within 3–5 sessions.'
          : 'FII selling at this magnitude is worth monitoring — sustained outflows have historically pressured the INR and mid/small-cap segments disproportionately.')
        : (todayVal >= 0
          ? 'Domestic institutions stepping in at this scale often signals that long-term Indian money views current levels as an entry opportunity.'
          : 'DII selling at this magnitude is unusual — it tends to coincide with fund redemption pressure rather than a fundamental view change.');

      findings.push({
        category: 'FII/DII Flow',
        score: 55 + Math.min(Math.abs(z) * 5, 25),
        headline: `${label} net ${direction} ${crore(todayVal)} — a ${strength} outlier at ${Math.abs(z).toFixed(1)}σ above the 60-session baseline`,
        stat: crore(todayVal),
        detail: `${label} flow of ${crore(todayVal)} on ${fmtDate(latestDate)} is ${Math.abs(z).toFixed(1)} standard deviations from the 60-session mean — well outside normal daily variation.`,
        implication,
        chart,
        tags: [`#${label}`, `#${label}Flows`, '#NiftyIndia', '#MacroIndia'],
        _cooldownKey: cooldownKey,
      });
    }

    // Streak — only if 5+ consecutive sessions AND longest in a year
    let streak = 0;
    const sign = todayVal >= 0 ? 1 : -1;
    for (const r of rowsDesc) {
      if ((sign > 0 ? r[key] > 0 : r[key] < 0)) streak++;
      else break;
    }

    if (streak >= 5) {
      const cooldownKey = `FII/DII:${label}_streak`;
      if (!isOnCooldown(cooldowns, cooldownKey, todayStr)) {
        const verb = sign > 0 ? 'buying' : 'selling';
        const yearRows = rowsDesc.slice(0, 252);
        let maxStreak = 0, cur = 0;
        for (let i = yearRows.length - 1; i >= 0; i--) {
          if ((sign > 0 ? yearRows[i][key] > 0 : yearRows[i][key] < 0)) { cur++; maxStreak = Math.max(maxStreak, cur); }
          else cur = 0;
        }
        const isLongest = streak >= maxStreak;

        findings.push({
          category: 'FII/DII Flow',
          score: streak * 8 + (isLongest ? 45 : 0),
          headline: `${label} net ${verb} for ${streak} consecutive sessions${isLongest ? ' — the longest run in a year' : ''}`,
          stat: `${streak}-session ${verb} streak`,
          detail: `${label} has maintained net ${verb} for ${streak} straight sessions through ${fmtDate(latestDate)}${isLongest ? ', the longest unbroken streak in the past year' : ''}.`,
          implication: label === 'FII'
            ? `Sustained institutional ${verb} over this many sessions is a trend signal, not noise — historically it has ${verb === 'buying' ? 'accompanied Nifty price appreciation with a 1-2 week lag' : 'preceded Nifty consolidation or correction phases'}.`
            : `DII ${verb} for this many sessions is a positioning signal — domestic funds are making a consistent directional bet.`,
          chart: fiiDiiBarChart(rowsDesc, key, label, Math.min(streak + 15, rowsDesc.length), streak),
          tags: [`#${label}`, `#${label}Flows`, '#NiftyIndia', '#InstitutionalFlows'],
          _cooldownKey: cooldownKey,
        });
      }
    }
  }
  return findings;
}

// ── Price history — 3-year lookback for index/sector extremes ─────────────
async function fetchPriceHistory() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT symbol, d, o, h, l, c, v
    FROM stock_eod
    WHERE d >= (SELECT MAX(d) FROM stock_eod) - INTERVAL '1100 days'
    ORDER BY symbol, d ASC
  `);
  return rows;
}

function groupBySymbol(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.symbol)) map.set(r.symbol, []);
    map.get(r.symbol).push(r);
  }
  return map;
}

// ── Index / broad market — multi-year fresh breakouts only ────────────────
// "Fresh" means: the previous session was NOT also at this extreme. This stops
// the scanner from posting "Nifty at 52-week high" every day during a trend.
// Window is 756 sessions (~3 years) — genuinely rare, genuinely informative.
function analyzeIndexes(bySymbol, cooldowns, todayStr) {
  const findings = [];

  for (const symbol of ALL_INDEX_SYMBOLS) {
    const series = bySymbol.get(symbol);
    if (!series || series.length < 300) continue;

    const window = Math.min(EXTREME_WINDOW, series.length - 1);
    const recent = series.slice(-(window + 1)); // +1 to check "was it at high yesterday"
    const windowSeries = recent.slice(1);      // last `window` sessions
    const closes = windowSeries.map((r) => Number(r.c));
    const last = closes[closes.length - 1];
    const prevCloses = recent.slice(0, -1).map((r) => Number(r.c));
    const prevMax = Math.max(...prevCloses.slice(-window));
    const prevMin = Math.min(...prevCloses.slice(-window));

    const isHigh = last >= Math.max(...closes);
    const isLow = last <= Math.min(...closes);
    const isFreshHigh = isHigh && recent[recent.length - 2] && Number(recent[recent.length - 2].c) < prevMax;
    const isFreshLow = isLow && recent[recent.length - 2] && Number(recent[recent.length - 2].c) > prevMin;

    if (!isFreshHigh && !isFreshLow) continue;

    const cooldownKey = `Index:${symbol}_${isHigh ? 'high' : 'low'}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

    const lastRow = windowSeries[windowSeries.length - 1];
    const sinceDate = fmtDate(windowSeries[0].d);
    const displayWindow = windowSeries.length;

    const isSector = SECTOR_SYMBOLS.includes(symbol);
    const label = symbol.replace(/^NIFTY /, '');

    const implication = isFreshHigh
      ? (isSector
        ? `A fresh ${displayWindow}-session high on ${label} — when a sector index breaks to a multi-year high, it often signals the beginning of a sustained outperformance phase rather than a one-day event. Watch whether broader indices confirm.`
        : `${symbol} at a ${displayWindow}-session high signals a healthy primary trend. For traders, the classic approach is to look for pullbacks to the breakout level as potential entry zones.`)
      : (isSector
        ? `${label} hitting a multi-year low signals sector-specific stress that may not yet be reflected in the broad market. Monitor whether it's isolated or starting to drag on broader indices.`
        : `A ${displayWindow}-session low on ${symbol} is a significant technical development — whether this is a shakeout or a trend change depends on breadth, volume, and FII participation in coming sessions.`);

    findings.push({
      category: 'India Equity',
      score: isFreshHigh ? (isSector ? 55 : 70) : (isSector ? 50 : 65),
      headline: `${symbol} just broke to a ${displayWindow}-session ${isFreshHigh ? 'high' : 'low'} — first time since ${sinceDate}`,
      stat: `${Number(last).toLocaleString('en-IN')}`,
      detail: `Close of ${Number(last).toFixed(2)} is the highest/lowest since ${sinceDate} (${displayWindow} sessions). Previous session was not at this level — this is a genuine breakout, not a grind.`,
      implication,
      chart: {
        type: 'line',
        title: `${symbol} — ${displayWindow}-Session ${isFreshHigh ? 'High' : 'Low'}`,
        rows: windowSeries,
        highlightIndex: windowSeries.length - 1,
      },
      tags: [indexTag(symbol), isFreshHigh ? '#Breakout' : '#Breakdown', '#NiftyIndia', isSector ? '#SectorPlay' : '#Nifty50'],
      _cooldownKey: cooldownKey,
    });
  }

  findings.sort((a, b) => b.score - a.score);
  return findings.slice(0, 3);
}

// ── Sector RS vs Nifty — MA crossover only ────────────────────────────────
// Instead of "ratio at 52-week high" (fires anytime a sector is in a trend),
// this fires only when the ratio LINE crosses its 50-day MA for the first
// time in 20+ sessions — a genuine trend-change signal.
function analyzeRatios(bySymbol, cooldowns, todayStr) {
  const findings = [];
  const niftyRows = bySymbol.get('NIFTY 50');
  if (!niftyRows || niftyRows.length < 200) return findings;

  const niftyByDate = new Map(niftyRows.map((r) => [String(r.d), Number(r.c)]));

  for (const symbol of SECTOR_SYMBOLS) {
    const series = bySymbol.get(symbol);
    if (!series || series.length < 200) continue;

    const ratioSeries = [];
    for (const r of series) {
      const niftyClose = niftyByDate.get(String(r.d));
      if (niftyClose) ratioSeries.push({ d: r.d, c: Number(r.c) / niftyClose });
    }
    if (ratioSeries.length < 200) continue;

    const ratioValues = ratioSeries.map((r) => r.c);
    const n = ratioValues.length;

    // 50-day MA of the ratio
    const ma50 = ratioValues.slice(-RS_MA_PERIOD).reduce((a, b) => a + b, 0) / RS_MA_PERIOD;
    const ma50Prev = ratioValues.slice(-(RS_MA_PERIOD + 1), -1).reduce((a, b) => a + b, 0) / RS_MA_PERIOD;
    const currentRatio = ratioValues[n - 1];
    const prevRatio = ratioValues[n - 2];

    const crossedAbove = prevRatio <= ma50Prev && currentRatio > ma50;
    const crossedBelow = prevRatio >= ma50Prev && currentRatio < ma50;

    if (!crossedAbove && !crossedBelow) continue;

    // Require that the last crossover in this direction was at least RS_CROSS_MIN_GAP sessions ago
    let sessionsSinceCross = RS_CROSS_MIN_GAP + 1;
    for (let i = n - 2; i >= Math.max(0, n - 60); i--) {
      const r = ratioValues[i];
      const ma = ratioValues.slice(Math.max(0, i - RS_MA_PERIOD), i).reduce((a, b) => a + b, 0) / Math.min(RS_MA_PERIOD, i);
      const rPrev = ratioValues[i - 1] ?? r;
      const maPrev = ratioValues.slice(Math.max(0, i - RS_MA_PERIOD - 1), i - 1).reduce((a, b) => a + b, 0) / Math.min(RS_MA_PERIOD, i - 1);
      if (crossedAbove && rPrev <= maPrev && r > ma) { sessionsSinceCross = n - 1 - i; break; }
      if (crossedBelow && rPrev >= maPrev && r < ma) { sessionsSinceCross = n - 1 - i; break; }
    }

    if (sessionsSinceCross < RS_CROSS_MIN_GAP) continue;

    const cooldownKey = `Ratio:${symbol}_${crossedAbove ? 'above' : 'below'}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

    const label = symbol.replace(/^NIFTY /, '');
    const lastRow = ratioSeries[ratioSeries.length - 1];

    findings.push({
      category: 'India Equity',
      score: 62,
      headline: `${label} sector just crossed ABOVE its 50-day relative-strength line vs Nifty 50 — first time in ${sessionsSinceCross}+ sessions`,
      stat: `RS ratio: ${currentRatio.toFixed(4)}`,
      detail: `The ${symbol} / NIFTY 50 ratio crossed ${crossedAbove ? 'above' : 'below'} its 50-day moving average on ${fmtDate(lastRow.d)}, signalling a fresh ${crossedAbove ? 'outperformance' : 'underperformance'} trend vs the broad market.`,
      implication: crossedAbove
        ? `When a sector's RS line crosses its 50-day MA after an extended period below it, the sector often enters a multi-week leadership phase. Stocks within ${label} become high-probability long candidates on Nifty pullbacks.`
        : `A sector losing relative strength at this point is often where capital rotation OUT has just begun. Stocks in ${label} that had been rising on broad market tailwinds become vulnerable on any market weakness.`,
      chart: {
        type: 'line',
        title: `${label} / NIFTY 50 Relative Strength`,
        rows: ratioSeries.slice(-252),
        highlightIndex: ratioSeries.slice(-252).length - 1,
      },
      tags: ['#RelativeStrength', indexTag(symbol), '#Nifty50', '#SectorRotation'],
      _cooldownKey: cooldownKey,
    });
  }

  findings.sort((a, b) => b.score - a.score);
  return findings.slice(0, 2);
}

// ── Individual stocks — high-volume breakouts only ────────────────────────
function analyzeStockUniverse(cooldowns, todayStr) {
  const findings = [];

  let raw;
  try {
    const stdout = execFileSync('python3', [path.join(__dirname, 'scan_stock_universe.py')], {
      maxBuffer: 1024 * 1024 * 64,
    });
    raw = JSON.parse(stdout.toString());
  } catch (e) {
    console.error('Stock universe scan failed (continuing without it):', e.message);
    return findings;
  }

  for (const f of raw.stockFindings) {
    // Require 2x+ volume confirmation — not just a new high, but on real participation
    if (f.volRatio < 2.0) continue;

    const cooldownKey = `Stock:${f.symbol}_${f.isHigh ? 'high' : 'low'}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

    const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: r.v }));
    const numLocale = f.market === 'India' ? 'en-IN' : 'en-US';
    findings.push({
      category: 'Stock Breakout',
      score: 40 + Math.min(f.volRatio * 4, 30),
      headline: `${f.symbol} (${f.market}) broke to a ${f.window}-session ${f.isHigh ? 'high' : 'low'} on ${f.volRatio.toFixed(1)}× normal volume`,
      stat: `${f.volRatio.toFixed(1)}× volume`,
      detail: `${f.symbol} closed at a new ${f.window}-session ${f.isHigh ? 'high' : 'low'} on ${fmtDate(f.lastDate)}, trading ${Math.round(f.lastVol).toLocaleString(numLocale)} shares vs a 20-session average of ${Math.round(f.avgVol20).toLocaleString(numLocale)} — ${f.volRatio.toFixed(1)}× normal participation.`,
      implication: f.isHigh
        ? `Volume-confirmed breakouts to multi-session highs have a meaningfully better follow-through rate than low-volume ones. Technicians treat this as a qualified breakout — watch for continuation in the next 3–5 sessions.`
        : `A multi-session low on elevated volume is distribution, not just weakness. The heavy selling at new lows suggests institutions are not catching falling knives here.`,
      chart: { type: 'line', title: `${f.symbol} — ${f.window}-Session ${f.isHigh ? 'High' : 'Low'}`, rows, highlightIndex: rows.length - 1, showVolume: true },
      tags: [tickerTag(f.symbol), f.isHigh ? '#Breakout' : '#Breakdown', f.market === 'India' ? '#NSE' : '#StockMarket', '#TechnicalAnalysis'],
      _cooldownKey: cooldownKey,
    });
  }

  findings.sort((a, b) => b.score - a.score);
  return findings.slice(0, 2);
}

// ── Intermarket — Copper/Gold, Brent 200-MA, Silver/Gold ──────────────────
// These are relationship signals, not price-level facts. Copper/Gold tells you
// whether growth expectations are rising vs fear; Brent crossing its 200-MA
// is directly relevant to India's current account; Silver/Gold tracks risk
// appetite within the metals complex.
function analyzeIntermarket(cooldowns, todayStr) {
  const findings = [];

  let raw;
  try {
    const stdout = execFileSync('python3', [path.join(__dirname, 'scan_intermarket.py')], {
      maxBuffer: 1024 * 1024 * 32,
    });
    raw = JSON.parse(stdout.toString());
  } catch (e) {
    console.error('Intermarket scan failed (continuing without it):', e.message);
    return findings;
  }

  for (const f of raw.findings) {
    const cooldownKey = `Intermarket:${f.id}_${f.direction}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

    if (f.id === 'copper_gold_ratio') {
      const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: 0 }));
      const isHigh = f.direction === 'high';
      const isCross = f.kind === 'ma_cross';

      const headlinePart = isCross
        ? `Copper/Gold ratio just crossed ${isHigh ? 'above' : 'below'} its 200-day average (now ${f.lastRatio.toFixed(4)})`
        : `Copper/Gold ratio at its ${isHigh ? 'highest' : 'lowest'} level in ${f.window} sessions (${f.lastRatio.toFixed(4)})`;

      findings.push({
        category: 'Macro/Intermarket',
        score: isCross ? 68 : 75,
        headline: headlinePart,
        stat: f.lastRatio.toFixed(4),
        detail: `Copper at $${f.copperClose.toFixed(2)} / Gold at $${f.goldClose.toFixed(2)} on ${fmtDate(f.lastDate)}. The Copper/Gold ratio ${isCross ? `crossed its 200-day MA (${f.ma200?.toFixed(4) ?? 'n/a'}) — a directional shift` : `is at a ${f.window}-session ${isHigh ? 'high' : 'low'}`}.`,
        implication: isHigh
          ? `Copper outperforming gold means the market is pricing in better growth expectations relative to safe-haven demand. Historically, a rising Copper/Gold ratio is associated with FII inflows into emerging markets including India, and sector rotation toward cyclicals (Metal, Auto, Infrastructure).`
          : `Copper underperforming gold signals the opposite: falling growth expectations, rising safe-haven demand. When this ratio is at multi-year lows, FII flows into Indian equities have historically become more volatile. Defensives (FMCG, Pharma) tend to hold up better than cyclicals.`,
        chart: { type: 'line', title: `Copper/Gold Ratio — ${f.window}-Session View`, rows, highlightIndex: rows.length - 1 },
        tags: ['#CopperGold', '#MacroIndia', '#GlobalMarkets', '#IntermarketAnalysis'],
        _cooldownKey: cooldownKey,
      });
    }

    if (f.id === 'brent_ma200') {
      const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: 0 }));
      const isAbove = f.direction === 'above';
      const isCross = f.kind === 'ma_cross';

      const headlinePart = isCross
        ? `Brent crude just crossed ${isAbove ? 'above' : 'below'} its 200-session average ($${f.lastClose.toFixed(2)})`
        : `Brent crude at a ${f.window}-session ${isAbove ? 'high' : 'low'} ($${f.lastClose.toFixed(2)})`;

      findings.push({
        category: 'Macro/Intermarket',
        score: isCross ? 65 : 60,
        headline: headlinePart,
        stat: `$${f.lastClose.toFixed(2)}`,
        detail: `Brent crude at $${f.lastClose.toFixed(2)} on ${fmtDate(f.lastDate)}${f.ma200 ? ` vs 200-session MA of $${f.ma200.toFixed(2)}` : ''}.`,
        implication: isAbove
          ? `India imports ~85% of its crude oil needs. Brent ${isCross ? 'crossing above' : 'at'} its long-term average is a direct pressure on India's current account deficit. Sectors most exposed: Airlines, Paints, Tyres (input cost pressure), and OMCs (marketing margin squeeze). Watch for corresponding INR weakness.`
          : `Brent ${isCross ? 'dropping below' : 'at'} its 200-session MA reduces India's import bill — a structural positive for the current account, INR stability, and RBI's rate trajectory. Beneficiaries: aviation, chemicals, and any sector with high energy input costs.`,
        chart: { type: 'line', title: `Brent Crude — 200-Session View`, rows, highlightIndex: rows.length - 1 },
        tags: ['#BrentCrude', '#MacroIndia', '#CrudeOil', '#CurrentAccount'],
        _cooldownKey: cooldownKey,
      });
    }

    if (f.id === 'silver_gold_ratio') {
      const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: 0 }));
      const isHigh = f.direction === 'high';

      findings.push({
        category: 'Macro/Intermarket',
        score: 58,
        headline: `Silver/Gold ratio at ${f.window}-session ${isHigh ? 'high' : 'low'} (${f.lastRatio.toFixed(3)}) — silver is ${isHigh ? 'sharply outperforming' : 'sharply underperforming'} gold`,
        stat: f.lastRatio.toFixed(3),
        detail: `Silver priced in gold at ${f.lastRatio.toFixed(3)} on ${fmtDate(f.lastDate)} — the ${isHigh ? 'highest' : 'lowest'} in ${f.window} sessions.`,
        implication: isHigh
          ? `Silver outperforming gold at a multi-year extreme signals strong risk appetite in commodities — the market is choosing the industrial metal over the safe haven. This has historically corresponded with equity market confidence and reduced demand for defensive assets.`
          : `Silver underperforming gold at a multi-year extreme is a classic risk-off read within the metals complex. When this ratio collapses, it typically accompanies broader market caution — worth cross-referencing with FII positioning and equity market breadth.`,
        chart: { type: 'line', title: `Silver/Gold Ratio — ${f.window}-Session View`, rows, highlightIndex: rows.length - 1 },
        tags: ['#SilverGold', '#MacroIndia', '#PreciousMetals', '#RiskAppetite'],
        _cooldownKey: cooldownKey,
      });
    }
  }

  findings.sort((a, b) => b.score - a.score);
  return findings.slice(0, 2);
}

// ── Commodity individual extremes ─────────────────────────────────────────
// Delegates to scan_commodities.py — 2-year window (504 sessions) instead of
// 1-year so the bar is meaningfully high. Fresh-breakout check applied here
// too (previous session not also at the extreme) to prevent daily repetition.
function analyzeCommodities(cooldowns, todayStr) {
  const findings = [];
  let raw;
  try {
    const stdout = execFileSync('python3', [path.join(__dirname, 'scan_commodities.py')], { maxBuffer: 1024 * 1024 * 64 });
    raw = JSON.parse(stdout.toString());
  } catch (e) {
    console.error('Commodities scan failed:', e.message);
    return findings;
  }

  for (const f of raw.commodityFindings) {
    if (f.kind !== 'extreme') continue; // skip tight_range — low signal value
    const cooldownKey = `Commodity:${f.symbol}_${f.isHigh ? 'high' : 'low'}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;
    const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: 0 }));
    const COMMODITY_INDIA_IMPACT = {
      XAUUSD: 'Gold is the largest single component of India\'s import bill after crude oil. Gold at multi-year highs pressures the current account and historically weakens INR — watch for RBI commentary.',
      XAGUSD: 'Silver has industrial demand (electronics, solar panels) alongside its precious-metal role — a multi-year extreme often signals a broader commodity cycle inflection.',
      WTICRUDE: 'India imports ~85% of its crude. WTI at multi-year extremes feeds directly into domestic fuel prices, inflation prints, and RBI rate-path expectations.',
      BRENT: 'India imports ~85% of its crude needs priced off Brent. A multi-year extreme here directly affects India\'s current account deficit, INR, and RBI\'s rate trajectory.',
      COPPER: 'Copper is the leading macro barometer — it tracks global industrial demand before it shows up in GDP data. A multi-year copper extreme is a signal about where global growth expectations are heading.',
      NATGAS: 'Natural gas at multi-year extremes affects global energy costs and fertiliser production — relevant for India\'s petrochemical and fertiliser sector margins.',
    };
    const impact = COMMODITY_INDIA_IMPACT[f.symbol] || `${f.name} at a multi-year extreme is a global commodity signal worth tracking for cross-asset positioning.`;
    findings.push({
      category: 'Macro/Intermarket',
      score: 60,
      headline: `${f.name} at its ${f.isHigh ? 'highest' : 'lowest'} level in ${f.window} sessions ($${f.lastClose.toFixed(2)})`,
      stat: `$${f.lastClose.toFixed(2)}`,
      detail: `${f.name} closed at $${f.lastClose.toFixed(2)} on ${fmtDate(f.lastDate)} — the ${f.isHigh ? 'highest' : 'lowest'} in ${f.window} sessions (~${Math.round(f.window / 252)} years of data).`,
      implication: impact,
      chart: { type: 'line', title: `${f.name} — ${f.window}-Session View`, rows, highlightIndex: rows.length - 1 },
      tags: [nameTag(f.name), f.isHigh ? '#MultiYearHigh' : '#MultiYearLow', '#MacroIndia', '#GlobalMarkets'],
      _cooldownKey: cooldownKey,
    });
  }

  findings.sort((a, b) => b.score - a.score);
  return findings.slice(0, 3);
}

// ── FII F&O positioning — index futures flip, PCR, stock/index divergence ──
// Four signals from NSE participant-wise F&O OI data (FnoLog table):
//
//  1. Index futures flip  — FII net (long−short) changes sign — the cleanest
//     Nifty direction signal available (pure directional bet, no delivery)
//
//  2. FII Put/Call ratio extreme — fiiIdxPutLong / fiiIdxCallLong at a 30-
//     session high or low. When FIIs are loading puts vs calls at an extreme,
//     they're hedging hard (or covering hedges) — a sentiment signal.
//
//  3. FII stock vs index divergence — FII net SHORT on index futures but net
//     LONG on stock futures (or vice versa). This is the classic pair-trade
//     setup: hedge the index, go long on selected names. Rare and specific.
//
//  4. DII vs FII direction split — domestic and foreign money pointing in
//     opposite directions on index futures. Tells you which camp is right
//     or which hand is the stronger one to follow.
async function analyzeFnoPositioning(cooldowns, todayStr) {
  const findings = [];
  try {
    const rows = await prisma.fnoLog.findMany({ orderBy: { date: 'desc' }, take: 40 });
    if (rows.length < 5) return findings;

    const parsed = rows.map((r) => ({
      date: r.date,
      fiiIdxNet: Number(r.fiiIdxFutLong) - Number(r.fiiIdxFutShort),
      fiiStkNet: Number(r.fiiStkFutLong) - Number(r.fiiStkFutShort),
      diiIdxNet: Number(r.diiIdxFutLong) - Number(r.diiIdxFutShort),
      fiiPCR: Number(r.fiiIdxCallLong) > 0 ? Number(r.fiiIdxPutLong) / Number(r.fiiIdxCallLong) : null,
      fiiIdxPutLong: Number(r.fiiIdxPutLong),
      fiiIdxCallLong: Number(r.fiiIdxCallLong),
      fiiIdxFutLong: Number(r.fiiIdxFutLong),
      fiiIdxFutShort: Number(r.fiiIdxFutShort),
      fiiStkFutLong: Number(r.fiiStkFutLong),
      fiiStkFutShort: Number(r.fiiStkFutShort),
      diiIdxFutLong: Number(r.diiIdxFutLong),
      diiIdxFutShort: Number(r.diiIdxFutShort),
    }));

    const cur = parsed[0];
    const prev = parsed[1];

    // ── Signal 1: FII index futures flip ──────────────────────────────────
    const flippedLong = prev.fiiIdxNet < 0 && cur.fiiIdxNet > 0;
    const flippedShort = prev.fiiIdxNet > 0 && cur.fiiIdxNet < 0;
    if (flippedLong || flippedShort) {
      const cooldownKey = `FnO:FII_idx_flip_${flippedLong ? 'long' : 'short'}`;
      if (!isOnCooldown(cooldowns, cooldownKey, todayStr)) {
        const direction = flippedLong ? 'net long' : 'net short';
        const prevSide = flippedLong ? 'net short' : 'net long';
        let streak = 1;
        for (let i = 2; i < parsed.length; i++) {
          if (flippedLong ? parsed[i].fiiIdxNet < 0 : parsed[i].fiiIdxNet > 0) streak++;
          else break;
        }
        findings.push({
          category: 'F&O Positioning',
          score: 78,
          headline: `FII index futures flipped to ${direction} after ${streak} sessions ${prevSide} — a Nifty direction signal`,
          stat: `Net: ${cur.fiiIdxNet.toFixed(0)} contracts`,
          detail: `FII net index futures position turned ${direction} (${cur.fiiIdxNet.toLocaleString('en-IN')} contracts) on ${cur.date}, reversing from ${prevSide} after ${streak} consecutive sessions. Source: NSE F&O participant-wise OI data.`,
          implication: flippedLong
            ? `FIIs flipping their index futures book from net short to net long is a high-conviction bullish signal for Nifty. Unlike cash equities, index futures positioning reflects a pure directional bet with no delivery overlay — when FIIs flip long here, they are explicitly betting Nifty goes up.`
            : `FIIs flipping from net long to net short in index futures is a direct Nifty bearish bet. This is not noise — it's a deliberate positioning change. Historically, sustained FII index futures short positions have coincided with Nifty underperformance and elevated volatility.`,
          chart: null,
          tags: ['#FII', '#NiftyFutures', '#FnO', '#NiftyIndia'],
          _cooldownKey: cooldownKey,
        });
      }
    }

    // ── Signal 2: FII Put/Call ratio at 30-session extreme ────────────────
    const pcrValues = parsed.filter((r) => r.fiiPCR !== null).map((r) => r.fiiPCR);
    if (cur.fiiPCR !== null && pcrValues.length >= 10) {
      const maxPcr = Math.max(...pcrValues);
      const minPcr = Math.min(...pcrValues);
      const pcrHigh = cur.fiiPCR >= maxPcr && (prev.fiiPCR ?? 0) < maxPcr;
      const pcrLow = cur.fiiPCR <= minPcr && (prev.fiiPCR ?? 0) > minPcr;

      if (pcrHigh || pcrLow) {
        const cooldownKey = `FnO:FII_PCR_${pcrHigh ? 'high' : 'low'}`;
        if (!isOnCooldown(cooldowns, cooldownKey, todayStr)) {
          const pcrRounded = cur.fiiPCR.toFixed(2);
          findings.push({
            category: 'F&O Positioning',
            score: 70,
            headline: `FII index options Put/Call ratio hit a ${pcrValues.length}-session ${pcrHigh ? 'high' : 'low'} at ${pcrRounded} — FIIs are ${pcrHigh ? 'loading up on puts (bearish hedge)' : 'unwinding put hedges (bullish lean)'}`,
            stat: `PCR: ${pcrRounded}`,
            detail: `FII index PCR = Put OI (${cur.fiiIdxPutLong.toLocaleString('en-IN')}) / Call OI (${cur.fiiIdxCallLong.toLocaleString('en-IN')}) = ${pcrRounded} on ${cur.date} — the ${pcrHigh ? 'highest' : 'lowest'} ratio in the past ${pcrValues.length} sessions. Source: NSE F&O participant-wise OI data.`,
            implication: pcrHigh
              ? `A rising FII put/call ratio means foreign money is buying significantly more index puts than calls — classic downside hedging. Either they expect a market decline, or they're protecting large long equity positions. Either way, it's a cautious signal for Nifty direction.`
              : `FII PCR at a recent low means they've unwound their put hedges relative to call exposure. When the world's largest traders reduce their downside protection at this level, it implies they see reduced near-term risk. This is a constructive signal for Nifty.`,
            chart: null,
            tags: ['#FII', '#PCR', '#FnO', '#NiftyHedge'],
            _cooldownKey: cooldownKey,
          });
        }
      }
    }

    // ── Signal 3: FII stock futures long vs index futures short ───────────
    // The "long alpha, hedge beta" pair trade — long selected stocks, short the
    // index. When both positions are at meaningful levels, it's worth flagging.
    const stkLongIdxShort = cur.fiiIdxNet < -50000 && cur.fiiStkNet > 50000;
    const stkShortIdxLong = cur.fiiIdxNet > 50000 && cur.fiiStkNet < -50000;
    if (stkLongIdxShort || stkShortIdxLong) {
      const cooldownKey = `FnO:FII_pair_trade_${stkLongIdxShort ? 'short_idx' : 'long_idx'}`;
      if (!isOnCooldown(cooldowns, cooldownKey, todayStr)) {
        findings.push({
          category: 'F&O Positioning',
          score: 65,
          headline: stkLongIdxShort
            ? `FII running a classic pair trade: short ${Math.abs(cur.fiiIdxNet).toLocaleString('en-IN')} index futures, long ${cur.fiiStkNet.toLocaleString('en-IN')} stock futures net`
            : `FII long ${cur.fiiIdxNet.toLocaleString('en-IN')} index futures but short ${Math.abs(cur.fiiStkNet).toLocaleString('en-IN')} stock futures — unusual directional split`,
          stat: `Idx net: ${cur.fiiIdxNet.toFixed(0)} | Stk net: ${cur.fiiStkNet.toFixed(0)}`,
          detail: `FII net index futures: ${cur.fiiIdxNet.toLocaleString('en-IN')} contracts (${cur.fiiIdxNet < 0 ? 'net short' : 'net long'}). FII net stock futures: ${cur.fiiStkNet.toLocaleString('en-IN')} contracts (${cur.fiiStkNet > 0 ? 'net long' : 'net short'}). As of ${cur.date}. Source: NSE F&O participant-wise OI.`,
          implication: stkLongIdxShort
            ? `FIIs shorting the index while staying long on individual stocks is a classic beta-neutral trade — they're hedging market risk (the index short) while maintaining upside exposure to selected names via stock futures. It implies they see stock-picking opportunities but are cautious on the broad Nifty direction. Watch for high-volume moves in large-cap stocks — that's where the long book likely sits.`
            : `FIIs long the index but short individual stocks — this is an unusual positioning where they're bullish on the market as a whole but bearish on specific names. Could signal expectations of a broad recovery with sector rotation away from specific stocks.`,
          chart: null,
          tags: ['#FII', '#FnO', '#PairTrade', '#NiftyIndia'],
          _cooldownKey: cooldownKey,
        });
      }
    }

    // ── Signal 4: DII vs FII index futures divergence ─────────────────────
    const diiLongFiiShort = cur.diiIdxNet > 10000 && cur.fiiIdxNet < -10000;
    const diishortFiiLong = cur.diiIdxNet < -10000 && cur.fiiIdxNet > 10000;
    if (diiLongFiiShort || diishortFiiLong) {
      const cooldownKey = `FnO:DII_FII_diverge_${diiLongFiiShort ? 'dii_long' : 'dii_short'}`;
      if (!isOnCooldown(cooldowns, cooldownKey, todayStr)) {
        const diiNet = cur.diiIdxNet;
        const fiiNet = cur.fiiIdxNet;
        findings.push({
          category: 'F&O Positioning',
          score: 62,
          headline: diiLongFiiShort
            ? `DII net long ${diiNet.toLocaleString('en-IN')} index futures while FII net short ${Math.abs(fiiNet).toLocaleString('en-IN')} — domestic and foreign money betting against each other`
            : `FII net long ${fiiNet.toLocaleString('en-IN')} index futures while DII net short ${Math.abs(diiNet).toLocaleString('en-IN')} — a rare directional conflict`,
          stat: `DII: ${diiNet.toFixed(0)} | FII: ${fiiNet.toFixed(0)}`,
          detail: `DII net index futures: ${diiNet.toLocaleString('en-IN')} contracts. FII net index futures: ${fiiNet.toLocaleString('en-IN')} contracts. Both positions meaningful in size as of ${cur.date}. Source: NSE F&O participant-wise OI.`,
          implication: diiLongFiiShort
            ? `Domestic institutions net long on index futures while FIIs are net short is one of the most interesting F&O setups — it's essentially a tug of war between India-based long-term money and foreign traders. Historically, when this divergence resolves, DII has tended to be on the right side of the trade more often in India's market context. Watch for FII covering (short-squeeze setup) if Nifty holds support.`
            : `FIIs net long on index futures while DIIs are net short is an unusual configuration — foreign money bullish while domestic institutions are hedged or cautious. This setup can lead to sharp moves when one side capitulates.`,
          chart: null,
          tags: ['#FII', '#DII', '#FnO', '#NiftyIndia'],
          _cooldownKey: cooldownKey,
        });
      }
    }

  } catch (e) {
    console.error('F&O positioning scan failed:', e.message);
  }
  return findings;
}

// ── Market breadth — % stocks above MA, A/D extremes ─────────────────────
// Fires only when breadth hits an extreme — not just "breadth is good/bad"
// which is always true, but specifically when:
//   • % above 200-MA crosses below 30% (washout) or above 80% (euphoria)
//   • % above 50-MA at a 90-day high or low
//   • Daily A/D ratio is more extreme than 4:1 or 1:4
// These are the breadth signals that actually predict turning points.
async function analyzeMarketBreadth(cooldowns, todayStr) {
  const findings = [];
  try {
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

    let above50 = 0, above200 = 0, total50 = 0, total200 = 0;
    let advances = 0, declines = 0;

    for (const closes of bySymbol.values()) {
      if (closes.length < 5) continue;
      const last = closes[closes.length - 1];
      const prev = closes[closes.length - 2];
      if (last > prev) advances++; else if (last < prev) declines++;

      if (closes.length >= 50) {
        total50++;
        const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        if (last > ma50) above50++;
      }
      if (closes.length >= 200) {
        total200++;
        const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
        if (last > ma200) above200++;
      }
    }

    const pct50 = total50 > 0 ? (above50 / total50) * 100 : 0;
    const pct200 = total200 > 0 ? (above200 / total200) * 100 : 0;
    const adRatio = declines > 0 ? advances / declines : advances;

    // Signal A: % above 200-MA at an extreme (< 30% washout or > 80% euphoria)
    if (pct200 < 30 || pct200 > 80) {
      const key = `Breadth:above200_${pct200 < 30 ? 'low' : 'high'}`;
      if (!isOnCooldown(cooldowns, key, todayStr)) {
        const isLow = pct200 < 30;
        findings.push({
          category: 'Market Breadth',
          score: 72,
          headline: `Only ${pct200.toFixed(0)}% of NSE stocks are above their 200-day MA — ${isLow ? 'a washout-level reading signalling broad distribution' : 'an elevated reading — most stocks are in long-term uptrends'}`,
          stat: `${pct200.toFixed(1)}%`,
          detail: `${above200} of ${total200} stocks with 200-day history are trading above their long-term moving average as of ${fmtDate(new Date(todayStr))}. At ${pct200.toFixed(0)}%, this is ${isLow ? 'near a historically oversold extreme' : 'approaching overbought territory where breadth has historically peaked'}.`,
          implication: isLow
            ? `When fewer than 30% of stocks are above their 200-day MA, the market is in broad distribution — this isn't selective weakness, it's systemic. Historically, readings below 25-30% have marked intermediate-term bottoms (with some lag), but they're also where the most damage happens before the turn. Two things to watch: are new lows still expanding, and is FII net selling still accelerating? When both stop, the breadth floor is near.`
            : `When over 80% of stocks are above their 200-day MA, breadth has reached a historic extreme on the bullish side. This is not a timing tool — markets can stay overbought — but it does tell you there's limited room for new money to come in and push things broadly higher. The next leg of any rally must be led by specific stocks, not the whole market.`,
          chart: null,
          tags: ['#MarketBreadth', '#200MA', isLow ? '#Oversold' : '#Overbought', '#NiftyIndia'],
          _cooldownKey: key,
        });
      }
    }

    // Signal B: % above 50-MA at an extreme (< 20% or > 85%)
    if (pct50 < 20 || pct50 > 85) {
      const key = `Breadth:above50_${pct50 < 20 ? 'low' : 'high'}`;
      if (!isOnCooldown(cooldowns, key, todayStr)) {
        const isLow = pct50 < 20;
        findings.push({
          category: 'Market Breadth',
          score: 65,
          headline: `${pct50.toFixed(0)}% of NSE stocks above 50-day MA — ${isLow ? 'the weakest short-term breadth reading in recent months' : 'near-maximum breadth participation'}`,
          stat: `${pct50.toFixed(1)}%`,
          detail: `${above50} of ${total50} stocks with 50-day history are trading above their intermediate-term average. At ${pct50.toFixed(0)}%, this is a ${isLow ? 'deeply compressed' : 'extended'} breadth reading.`,
          implication: isLow
            ? `Less than 20% of stocks above their 50-day MA means the majority of the market is already in a short-term downtrend. Rallies from this level have historically been sharp but often short-lived unless breadth improves sustainably (50% crossing back above 50% is the confirmation signal). Avoid averaging down broadly — the breadth says the market isn't ready yet.`
            : `Over 85% of stocks above their 50-day MA is maximum breadth participation — nearly every stock is in a short-term uptrend. While this is structurally healthy, it also means there are very few beaten-down names to rotate into. Any catalyst for profit-taking will find a crowded trade.`,
          chart: null,
          tags: ['#MarketBreadth', '#50MA', '#BreadthIndicator', '#NiftyIndia'],
          _cooldownKey: key,
        });
      }
    }

    // Signal C: extreme daily A/D ratio (> 4:1 or < 1:4)
    if (adRatio > 4 || adRatio < 0.25) {
      const key = `Breadth:AD_${adRatio > 4 ? 'surge' : 'collapse'}`;
      if (!isOnCooldown(cooldowns, key, todayStr)) {
        const isSurge = adRatio > 4;
        findings.push({
          category: 'Market Breadth',
          score: 60,
          headline: `Advance/Decline ratio hit ${adRatio.toFixed(1)}:1 today — ${isSurge ? 'a broad-based surge across the NSE universe' : 'near-total market selling with almost no survivors'}`,
          stat: `A/D: ${adRatio.toFixed(1)}:1`,
          detail: `${advances} stocks advanced vs ${declines} declined on ${fmtDate(new Date(todayStr))} — an A/D ratio of ${adRatio.toFixed(1)}:1. This is statistically unusual; most sessions see ratios between 0.5:1 and 2:1.`,
          implication: isSurge
            ? `A 4:1+ advance/decline ratio is a power thrust — when markets surge this broadly, it's rarely just noise. Historically, A/D ratios above 4:1 have marked the early stages of significant upmoves, not the end of them. The key check: was this accompanied by volume? A breadth thrust on below-average volume is less reliable than one on expanding participation.`
            : `An A/D ratio below 0.25 means 4 stocks fell for every 1 that rose — near-indiscriminate selling across the entire market. These sessions tend to cluster near capitulation events. They're uncomfortable in the moment but historically mark areas where risk/reward for buyers improves significantly. Watch whether this is confirmed by heavy volume (capitulation) or is just a dull down day.`,
          chart: null,
          tags: ['#AdvanceDecline', '#MarketBreadth', isSurge ? '#BreadthSurge' : '#BreadthCollapse', '#NiftyIndia'],
          _cooldownKey: key,
        });
      }
    }
  } catch (e) {
    console.error('Market breadth scan failed:', e.message);
  }
  return findings;
}

// ── US market context — S&P 500 / major global index extremes ─────────────
// India equity investors track US markets closely — FII flows, IT sector
// earnings, and global risk appetite are all US-correlated. A genuine
// multi-year extreme on the S&P 500 (from the parquet universe) is worth
// flagging because it changes the context for every India market call.
function analyzeGlobalMarkets(cooldowns, todayStr) {
  const findings = [];
  let raw;
  try {
    const stdout = execFileSync('python3', [path.join(__dirname, 'scan_stock_universe.py')], { maxBuffer: 1024 * 1024 * 64 });
    raw = JSON.parse(stdout.toString());
  } catch (e) {
    return findings; // already covered in analyzeStockUniverse
  }

  // Filter for specific macro proxies in the US universe
  const GLOBAL_PROXIES = new Set(['SPY', 'QQQ', 'IWM', 'EEM', 'VTI']);
  for (const f of (raw.stockFindings || [])) {
    if (f.market !== 'US' || !GLOBAL_PROXIES.has(f.symbol)) continue;
    const cooldownKey = `Global:${f.symbol}_${f.isHigh ? 'high' : 'low'}`;
    if (isOnCooldown(cooldowns, cooldownKey, todayStr)) continue;

    const PROXY_NAME = { SPY: 'S&P 500 ETF (SPY)', QQQ: 'Nasdaq 100 (QQQ)', IWM: 'Russell 2000 (IWM)', EEM: 'EM Equities (EEM)', VTI: 'Total US Market (VTI)' };
    const name = PROXY_NAME[f.symbol] || f.symbol;
    const rows = f.series.map((r) => ({ d: r.d, c: r.c, v: r.v }));

    findings.push({
      category: 'Global Markets',
      score: 65,
      headline: `${name} just broke to a ${f.window}-session ${f.isHigh ? 'high' : 'low'} — first time since ${fmtDate(f.series[0]?.d)}`,
      stat: `${f.volRatio.toFixed(1)}× volume`,
      detail: `${f.symbol} closed at a ${f.window}-session ${f.isHigh ? 'high' : 'low'} on ${fmtDate(f.lastDate)}, on ${f.volRatio.toFixed(1)}× normal volume.`,
      implication: f.isHigh
        ? `Global equity strength at multi-year highs typically supports FII risk appetite for emerging markets including India. Watch whether domestic flows confirm the global tailwind, and which India sectors benefit most from a risk-on global environment (Financials, IT, Metals tend to lead).`
        : `Global equity weakness at multi-year lows often precedes FII outflows from India — the correlation between S&P drawdowns and Nifty corrections is historically strong. Monitor FII cash flows in the next 5 sessions for early confirmation.`,
      chart: { type: 'line', title: `${name} — ${f.window}-Session View`, rows, highlightIndex: rows.length - 1, showVolume: true },
      tags: [`#${f.symbol}`, f.isHigh ? '#GlobalBull' : '#GlobalRisk', '#MacroIndia', '#FIIFlows'],
      _cooldownKey: cooldownKey,
    });
  }
  return findings;
}

// ── Promoter activity ──────────────────────────────────────────────────────
const NSE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const PROMOTER_CATEGORIES = new Set(['Promoters', 'Promoter Group']);
const GENUINE_MODES = new Set(['Market Purchase', 'Market Sale']);
const MIN_PROMOTER_VALUE = 50_000_000; // ₹5 Cr — filters out small/irrelevant disclosures

function parseNseDate(s) {
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [dd, mon, yyyy] = s.split('-');
  return new Date(Number(yyyy), months[mon], Number(dd));
}
function fmtNseDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

async function fetchPromoterDisclosures() {
  const home = await fetch('https://www.nseindia.com/companies-listing/corporate-filings-insider-trading', {
    headers: { 'User-Agent': NSE_UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!home.ok) throw new Error(`NSE homepage returned ${home.status}`);
  const cookies = home.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

  let fromStr = process.env.PROMOTER_FROM;
  let toStr = process.env.PROMOTER_TO;
  if (!fromStr || !toStr) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 120);
    fromStr = fmtNseDate(from);
    toStr = fmtNseDate(to);
  }
  const url = `https://www.nseindia.com/api/corporates-pit?index=equities&from_date=${fromStr}&to_date=${toStr}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': NSE_UA, Accept: '*/*', Referer: 'https://www.nseindia.com/companies-listing/corporate-filings-insider-trading', Cookie: cookies },
  });
  if (!res.ok) throw new Error(`NSE PIT API returned ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

const PROMOTER_STATE_PATH = path.join(__dirname, 'state', 'seen_promoter_disclosures.json');
function loadSeenPromoterIds() {
  try { return new Set(JSON.parse(fs.readFileSync(PROMOTER_STATE_PATH, 'utf-8'))); }
  catch { return new Set(); }
}
function saveSeenPromoterIds(ids) {
  fs.mkdirSync(path.dirname(PROMOTER_STATE_PATH), { recursive: true });
  fs.writeFileSync(PROMOTER_STATE_PATH, JSON.stringify([...ids]));
}

function analyzePromoterActivity(rows) {
  const findings = [];
  const dedupeInBatch = new Set();
  const seenIds = loadSeenPromoterIds();
  const candidates = [];

  for (const r of rows) {
    if (!PROMOTER_CATEGORIES.has(r.personCategory)) continue;
    if (!GENUINE_MODES.has(r.acqMode)) continue;
    const value = Number(r.secVal) || 0;
    if (value < MIN_PROMOTER_VALUE) continue;
    if (r.did && seenIds.has(String(r.did))) continue;

    const key = `${r.symbol}|${r.acqName}|${r.intimDt}|${r.secAcq}|${r.tdpTransactionType}`;
    if (dedupeInBatch.has(key)) continue;
    dedupeInBatch.add(key);
    candidates.push(r);
  }

  for (const r of candidates) {
    const isBuy = r.tdpTransactionType === 'Buy';
    const befPct = parseFloat(r.befAcqSharesPer) || 0;
    const aftPct = parseFloat(r.afterAcqSharesPer) || 0;
    const valueCr = (Number(r.secVal) || 0) / 1e7;
    const holdingChange = Math.abs(aftPct - befPct).toFixed(2);

    findings.push({
      category: 'Promoter Activity',
      score: 22 + Math.min(valueCr * 2, 30),
      headline: `Promoter of ${r.company} ${isBuy ? 'bought' : 'sold'} ₹${valueCr.toFixed(2)} Cr in the open market — holding moved ${befPct}% → ${aftPct}%`,
      stat: `₹${valueCr.toFixed(2)} Cr`,
      detail: `${r.acqName} (${r.personCategory}) ${isBuy ? 'acquired' : 'disposed of'} ${Number(r.secAcq).toLocaleString('en-IN')} shares of ${r.symbol} via ${r.acqMode.toLowerCase()} on ${fmtDate(parseNseDate(r.intimDt))}. Promoter stake: ${befPct}% → ${aftPct}% (${holdingChange}% change). Source: NSE SEBI PIT Reg 7(2) filing — inter-se transfers, ESOP, gifts and pledges are excluded.`,
      implication: isBuy
        ? `Open-market promoter buying is the cleanest conviction signal available — unlike ESOP exercises or inter-se transfers, it costs the promoter real cash at market prices. A ₹${valueCr.toFixed(0)} Cr purchase signals strong insider confidence in ${r.symbol}'s outlook.`
        : `Promoter selling via the open market at this scale warrants attention. While liquidity, diversification, and tax planning are common reasons, the timing and size relative to total promoter holding (${aftPct}% remaining) adds context.`,
      chart: null,
      tags: [tickerTag(r.symbol), isBuy ? '#PromoterBuying' : '#PromoterSelling', '#InsiderActivity', '#NSE'],
      _did: r.did ? String(r.did) : null,
    });
  }

  findings.sort((a, b) => b.score - a.score);
  const top = findings.slice(0, 2);
  for (const f of top) {
    if (f._did) seenIds.add(f._did);
    delete f._did;
  }
  saveSeenPromoterIds(seenIds);
  return top;
}

// ── Caption drafting — analyst voice, not news ticker ─────────────────────
// Three variants per finding, each genuinely different in angle:
//   1. Observation-first: the fact + rarity context
//   2. Implication-first: what this means for markets
//   3. Question-framing: the forward-looking setup
function captionVariants(f) {
  const tagLine = f.tags?.length ? hashtagLine(f.tags) : '';
  const withTags = (body) => (tagLine ? `${body}\n\n${tagLine}` : body);
  const impl = f.implication || '';

  const v1 = withTags(`${f.headline}.\n\n${f.detail}${impl ? `\n\n${impl}` : ''}`);
  const v2 = impl ? withTags(`${impl}\n\nWhat triggered this: ${f.headline}.`) : v1;
  const v3 = withTags(`Data point for the week:\n\n${f.headline}.\n\n${impl || f.detail}`);

  return [v1, v2, v3];
}

function buildReport(findings, dateLabel) {
  let out = `# Chartix Daily Insight Scan — ${dateLabel}\n\n`;
  out += `Scanned: 3-year India index/sector extremes, FII/DII statistical outliers, sector RS crossovers, intermarket signals (Copper/Gold, Brent, Silver/Gold), F&O positioning (FII futures flip, PCR, pair-trade, DII divergence), market breadth (% above 50/200 MA, A/D ratio extremes), stock breakouts with 2×+ volume, NSE promoter disclosures.\n`;
  out += `Cooldown: 21 days per symbol — nothing repeats within a month.\n\n---\n\n`;

  if (findings.length === 0) {
    out += 'No sufficiently rare, verified finding today. Nothing posted is the right call — check back tomorrow.\n';
    return out;
  }

  findings.forEach((f, i) => {
    out += `## ${i + 1}. [${f.category}] Score: ${f.score.toFixed(0)}\n\n`;
    out += `**Signal:** ${f.headline}\n\n`;
    if (f.detail) out += `**Data:** ${f.detail}\n\n`;
    if (f.implication) out += `**Why it matters:** ${f.implication}\n\n`;
    out += `**Caption variants:**\n\n`;
    captionVariants(f).forEach((v, j) => {
      out += `> **Variant ${j + 1}:**\n> ${v.replace(/\n/g, '\n> ')}\n\n`;
    });
    if (f.chart) out += `**Chart:** \`chart_${i + 1}.png\`\n\n`;
    out += `---\n\n`;
  });

  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching data...');
  const [fiiDii, priceRows] = await Promise.all([fetchFiiDii(), fetchPriceHistory()]);

  if (priceRows.length === 0) {
    console.error('No price data returned — aborting.');
    process.exit(1);
  }

  const latestDataDate = priceRows[priceRows.length - 1].d;
  const todayStr = new Date(latestDataDate).toISOString().slice(0, 10);
  const dateLabel = fmtDate(latestDataDate);
  const outDir = path.join(__dirname, 'output', todayStr);
  fs.mkdirSync(outDir, { recursive: true });

  const cooldowns = loadCooldowns();

  console.log('Analyzing FII/DII flows (z-score threshold)...');
  const fiiDiiFindings = analyzeFiiDii(fiiDii, cooldowns, todayStr);

  console.log('Grouping and analyzing index/sector data (3-year window, fresh breakouts only)...');
  const bySymbol = groupBySymbol(priceRows);
  const indexFindings = analyzeIndexes(bySymbol, cooldowns, todayStr);

  console.log('Computing sector RS crossovers vs Nifty 50...');
  const ratioFindings = analyzeRatios(bySymbol, cooldowns, todayStr);

  console.log('Scanning intermarket signals (Copper/Gold, Brent MA, Silver/Gold)...');
  const intermarketFindings = analyzeIntermarket(cooldowns, todayStr);

  console.log('Scanning commodity individual extremes (2-year bar)...');
  const commodityFindings = analyzeCommodities(cooldowns, todayStr);

  console.log('Checking FII F&O index futures positioning...');
  const fnoFindings = await analyzeFnoPositioning(cooldowns, todayStr);

  console.log('Computing market breadth (% above 50/200 MA, A/D ratio)...');
  const breadthFindings = await analyzeMarketBreadth(cooldowns, todayStr);

  console.log('Scanning stock universe (2×+ volume breakouts only)...');
  const stockFindings = analyzeStockUniverse(cooldowns, todayStr);

  console.log('Scanning global market proxies (S&P 500, Nasdaq, EM)...');
  const globalFindings = analyzeGlobalMarkets(cooldowns, todayStr);

  console.log('Fetching promoter disclosures (genuine open-market only)...');
  let promoterFindings = [];
  try {
    const rows = await fetchPromoterDisclosures();
    promoterFindings = analyzePromoterActivity(rows);
  } catch (e) {
    console.error('Promoter fetch failed (continuing without it):', e.message);
  }

  const allFindings = [
    ...fnoFindings,           // highest priority — F&O positioning signals
    ...intermarketFindings,   // macro context
    ...globalFindings,        // global equity context
    ...fiiDiiFindings,        // institutional flow
    ...breadthFindings,       // market breadth extremes
    ...commodityFindings,     // commodity extremes
    ...indexFindings,         // India index/sector breakouts
    ...ratioFindings,         // sector RS crossovers
    ...stockFindings,         // individual stock breakouts
    ...promoterFindings,      // insider activity
  ].sort((a, b) => b.score - a.score);

  // Greedy selection: max MAX_FINDINGS total, MAX_PER_CATEGORY per category.
  const categoryCounts = {};
  const top = [];
  for (const f of allFindings) {
    const count = categoryCounts[f.category] ?? 0;
    if (count >= MAX_PER_CATEGORY) continue;
    top.push(f);
    categoryCounts[f.category] = count + 1;
    if (top.length >= MAX_FINDINGS) break;
  }

  // Commit cooldowns for everything that's being reported
  for (const f of top) {
    if (f._cooldownKey) cooldowns[f._cooldownKey] = todayStr;
  }
  saveCooldowns(cooldowns);

  console.log(`Found ${allFindings.length} candidates → reporting top ${top.length} (max ${MAX_PER_CATEGORY}/category, ${MAX_FINDINGS} total).`);

  const report = buildReport(top, dateLabel);
  fs.writeFileSync(path.join(outDir, 'report.md'), report);

  for (let i = 0; i < top.length; i++) {
    const f = top[i];
    if (!f.chart) continue;

    let chartData;
    if (f.chart.type === 'line') {
      chartData = {
        type: 'line', title: f.chart.title, subtitle: f.headline,
        rows: f.chart.rows.map((r) => ({ d: r.d, c: Number(r.c), v: Number(r.v ?? 0) })),
        highlightIndex: f.chart.highlightIndex, showVolume: !!f.chart.showVolume,
      };
    } else if (f.chart.type === 'bar_flow') {
      chartData = { type: 'bar_flow', title: f.chart.title, subtitle: f.headline, rows: f.chart.rows, highlightIndices: f.chart.highlightIndices };
    } else {
      continue;
    }

    const dataPath = path.join(outDir, `chart_${i + 1}_data.json`);
    fs.writeFileSync(dataPath, JSON.stringify(chartData));
    const pngPath = path.join(outDir, `chart_${i + 1}.png`);
    try {
      execFileSync('python3', [path.join(__dirname, 'render_chart.py'), dataPath, pngPath], { stdio: 'inherit' });
      console.log('Chart saved:', pngPath);
    } catch (e) {
      console.error(`Chart render failed for finding #${i + 1}:`, e.message);
    }
  }

  const findingsJson = top.map((f) => ({
    category: f.category,
    score: f.score,
    headline: f.headline,
    stat: f.stat,
    detail: f.detail,
    implication: f.implication,
    hasChart: !!f.chart,
    tags: f.tags?.length ? hashtagLine(f.tags) : '',
  }));
  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(findingsJson, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Report saved to:', path.join(outDir, 'report.md'));
  console.log('='.repeat(60) + '\n');
  console.log(report);

  if (process.env.SKIP_TELEGRAM === '1') {
    console.log('\nSKIP_TELEGRAM=1 — not delivering (report + charts saved locally).');
    await prisma.$disconnect();
    return;
  }

  console.log('\nDelivering to Telegram...');
  try {
    await deliverToTelegram(outDir, dateLabel, findingsJson);
    console.log('Telegram delivery done.');
  } catch (e) {
    console.error('Telegram delivery failed (report + charts still saved locally):', e.message);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
