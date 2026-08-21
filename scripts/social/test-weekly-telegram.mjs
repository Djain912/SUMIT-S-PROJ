/**
 * Test script — generates all 6 weekly infographic cards with sample data
 * and delivers them to Telegram exactly as the Friday weekly scan would.
 *
 * Usage: node scripts/social/test-weekly-telegram.mjs
 */
import fs   from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── load .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/)
           || line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(\S*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT   = process.env.TELEGRAM_CHAT_ID;
const API    = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN || !CHAT) {
  console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing in .env');
  process.exit(1);
}

// ── Telegram helpers ───────────────────────────────────────────────────────
async function sendMsg(text) {
  const r = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML',
                           disable_web_page_preview: true }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error('sendMessage failed: ' + JSON.stringify(d));
}

async function sendPhoto(filePath, caption) {
  const form = new FormData();
  form.append('chat_id', CHAT);
  form.append('caption', caption.slice(0, 1024));
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([fs.readFileSync(filePath)]),
              path.basename(filePath));
  const r = await fetch(`${API}/sendPhoto`, { method: 'POST', body: form });
  const d = await r.json();
  if (!d.ok) throw new Error('sendPhoto failed: ' + JSON.stringify(d));
}

// ── Render helper ──────────────────────────────────────────────────────────
const RENDERER = path.join(__dirname, 'render_infographic.py');
const TMP      = path.join(__dirname, 'tmp_test_cards');
fs.mkdirSync(TMP, { recursive: true });

function render(template, data, outFile) {
  const jsonPath = path.join(TMP, `${template}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ template, ...data }));
  execSync(`python3 "${RENDERER}" "${jsonPath}" "${outFile}"`, { stdio: 'inherit' });
}

// ── Sample data ────────────────────────────────────────────────────────────
const DATE = '21-Aug-2026';

const cards = [
  {
    template: 'sector_weekly',
    data: {
      nifty_pct: -0.82,
      date: DATE,
      sectors: [
        { label: 'Nifty IT',      pct:  3.21 },
        { label: 'Nifty FMCG',   pct:  1.84 },
        { label: 'Nifty Bank',   pct:  0.95 },
        { label: 'Nifty Auto',   pct:  0.42 },
        { label: 'Nifty Pharma', pct: -0.33 },
        { label: 'Nifty Metal',  pct: -1.17 },
        { label: 'Nifty Realty', pct: -2.05 },
        { label: 'Nifty Energy', pct: -2.88 },
      ],
    },
    caption:
      '📊 <b>Weekly Sector Performance</b>\n\n' +
      'IT leads with +3.2% while Energy lags at -2.9%. ' +
      'Nifty 50 closed the week at -0.82% — sector rotation favours defensives + tech.\n\n' +
      '#Nifty #SectorRotation #WeeklyReview',
  },
  {
    template: 'breadth_snapshot',
    data: {
      pct_above_20: 62, pct_above_50: 48, pct_above_200: 41,
      advances: 1124, declines: 734,
      weekly_advances: 980, weekly_declines: 876,
      total: 1891, date: DATE,
    },
    caption:
      '📈 <b>Market Breadth Snapshot</b>\n\n' +
      '62% of NSE stocks above 20-DMA | 48% above 50-DMA | 41% above 200-DMA. ' +
      'Daily A/D ratio 1.5:1 — breadth is recovering but long-term trend still split.\n\n' +
      '#MarketBreadth #NSE #Breadth',
  },
  {
    template: 'fno_positioning',
    data: {
      date: DATE,
      rows: [
        { label: 'FII Index Fut Net',  value: '-1,24,500', change: '-18,200', colour: '#DC2626', signal: 'Bearish' },
        { label: 'FII Stock Fut Net',  value: '+88,300',   change: '+11,400', colour: '#16A34A', signal: 'Bullish' },
        { label: 'FII Pair Trade',     value: 'Active',    change: '',        colour: '#D97706', signal: 'Hedge'   },
        { label: 'DII Index Fut Net',  value: '+42,100',   change: '+6,300',  colour: '#16A34A', signal: 'Long'    },
        { label: 'FII PCR',            value: '1.34',      change: '+0.12',   colour: '#DC2626', signal: 'Bearish' },
      ],
    },
    caption:
      '🔍 <b>FII F&O Positioning Scorecard</b>\n\n' +
      'FIIs are short index futures but long individual stocks — classic pair trade / hedge. ' +
      'PCR at 1.34 signals elevated put buying. DII is absorbing selling on the index.\n\n' +
      '#FII #FnO #OpenInterest #NSE',
  },
  {
    template: 'cash_flows',
    data: {
      fii_total: -3420, dii_total: 5110, date: DATE,
      days: [
        { date: 'Mon', fii:  -800, dii:  900 },
        { date: 'Tue', fii: -1200, dii: 1100 },
        { date: 'Wed', fii:   400, dii:  800 },
        { date: 'Thu', fii: -1100, dii: 1400 },
        { date: 'Fri', fii:  -720, dii:  910 },
      ],
    },
    caption:
      '💰 <b>FII / DII Weekly Cash Flows</b>\n\n' +
      'FIIs net sold ₹3,420 Cr this week; DIIs absorbed with ₹5,110 Cr of buying. ' +
      'Combined net positive ₹1,690 Cr. Domestic institutions are providing a strong floor.\n\n' +
      '#FII #DII #CashFlows #NSE',
  },
  {
    template: 'top_movers',
    data: {
      total: 1891, date: DATE,
      top: [
        { symbol: 'INFY',       pct:  8.4 },
        { symbol: 'TCS',        pct:  7.1 },
        { symbol: 'HCLTECH',    pct:  6.8 },
        { symbol: 'WIPRO',      pct:  5.9 },
        { symbol: 'LTIM',       pct:  5.2 },
        { symbol: 'TECHM',      pct:  4.7 },
        { symbol: 'PERSISTENT', pct:  4.1 },
        { symbol: 'MPHASIS',    pct:  3.8 },
      ],
      bottom: [
        { symbol: 'ADANIENT', pct: -9.2 },
        { symbol: 'COAL',     pct: -7.8 },
        { symbol: 'ONGC',     pct: -6.5 },
        { symbol: 'NHPC',     pct: -5.9 },
        { symbol: 'RECLTD',   pct: -5.1 },
        { symbol: 'PFC',      pct: -4.6 },
        { symbol: 'SJVN',     pct: -4.0 },
        { symbol: 'IRFC',     pct: -3.5 },
      ],
    },
    caption:
      '🏆 <b>Week\'s Top & Bottom Movers</b>\n\n' +
      'IT stocks dominated gains — INFY +8.4%, TCS +7.1%. ' +
      'PSU energy and infra names led the declines; ADANIENT -9.2% worst performer.\n\n' +
      '#TopMovers #NSE #WeeklyReview',
  },
  {
    template: 'fno_pcr',
    data: {
      pcr: 1.34, put_oi: 1240000, call_oi: 924000,
      prev_pcr: 1.22, date: DATE,
      history: [
        { date: '28-Jul', pcr: 1.10 }, { date: '29-Jul', pcr: 1.18 },
        { date: '30-Jul', pcr: 0.98 }, { date: '31-Jul', pcr: 1.05 },
        { date: '01-Aug', pcr: 1.14 }, { date: '04-Aug', pcr: 1.22 },
        { date: '05-Aug', pcr: 1.19 }, { date: '06-Aug', pcr: 1.28 },
        { date: '07-Aug', pcr: 1.31 }, { date: '08-Aug', pcr: 1.34 },
      ],
    },
    caption:
      '📉 <b>FII Put/Call Ratio — 1.34</b>\n\n' +
      'PCR rising week-on-week (1.22 → 1.34). FIIs are loading up on index puts — ' +
      'suggests hedging against downside rather than outright bearishness. Watch 1.5 as the danger zone.\n\n' +
      '#PCR #FII #Options #NSE',
  },
];

// ── Main ───────────────────────────────────────────────────────────────────
console.log('Generating 6 infographic cards...');

const imgPaths = [];
for (const card of cards) {
  const outFile = path.join(TMP, `${card.template}.png`);
  render(card.template, card.data, outFile);
  imgPaths.push({ file: outFile, caption: card.caption });
}

console.log('\nSending to Telegram...');
await sendMsg(`📊 <b>Chartix Weekly Market Report — ${DATE}</b>\n\n6 infographic cards below. Forward whichever you like to X.\n\n<i>This is a sample test run.</i>`);

for (const { file, caption } of imgPaths) {
  await sendPhoto(file, caption);
  await new Promise(r => setTimeout(r, 800));  // avoid Telegram rate limit
}

await sendMsg('✅ All 6 weekly cards delivered. Check each one and reply with any layout feedback.');
console.log('\nDone — all 6 cards sent to Telegram.');

// cleanup temp files
fs.rmSync(TMP, { recursive: true, force: true });
