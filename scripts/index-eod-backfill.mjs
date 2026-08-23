// Backfill OFFICIAL NSE index series (Nifty 50, Bank Nifty, sector indices…)
// from the eod2_data GitHub dataset into the same stock_eod table, keyed by the
// official index name in UPPERCASE (e.g. 'NIFTY 50'). Stock tickers never
// contain spaces, so index symbols can share the table without collisions.
// Sensex (BSE) is not in eod2_data — backfilled from Yahoo ^BSESN instead.
// Idempotent — safe to re-run. Optional CLI args restrict to specific symbols.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RAW = 'https://raw.githubusercontent.com/BennyThadikaran/eod2_data/main/daily';

// DB symbol → eod2 dataset filename (without .csv)
const INDEXES = {
  'NIFTY 50': 'nifty 50',
  'NIFTY BANK': 'nifty bank',
  'NIFTY PRIVATE BANK': 'nifty private bank',
  'NIFTY PSU BANK': 'nifty psu bank',
  'NIFTY FINANCIAL SERVICES': 'nifty financial services',
  'NIFTY IT': 'nifty it',
  'NIFTY MIDSMALL IT & TELECOM': 'nifty midsmall it & telecom',
  'NIFTY AUTO': 'nifty auto',
  'NIFTY CHEMICALS': 'nifty chemicals',
  'NIFTY METAL': 'nifty metal',
  'NIFTY POWER': 'nifty power',
  'NIFTY OIL & GAS': 'nifty oil & gas',
  'NIFTY FMCG': 'nifty fmcg',
  'NIFTY CONSUMER DURABLES': 'nifty consumer durables',
  'NIFTY CONSUMER SERVICES': 'nifty consumer services',
  'NIFTY HEALTHCARE INDEX': 'nifty healthcare index',
  'NIFTY PHARMA': 'nifty pharma',
  'NIFTY500 HEALTHCARE': 'nifty500 healthcare',
  'NIFTY MIDSMALL HEALTHCARE': 'nifty midsmall healthcare',
  'NIFTY REALTY': 'nifty realty',
  'NIFTY TOP 10 EQUAL WEIGHT': 'nifty top 10 equal weight',
  'NIFTY INDIA DEFENCE': 'nifty india defence',
};

const only = process.argv.slice(2).map((s) => s.toUpperCase());

function parseIndexCsv(text) {
  // Date,Open,High,Low,Close,Volume,P/E,... — no Series column for indices.
  const rows = [];
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) continue;
    const p = ln.split(',');
    const d = p[0];
    const o = +p[1], h = +p[2], l = +p[3], c = +p[4];
    const v = Math.round(+p[5] || 0);
    if (!d || !(c > 0)) continue;
    rows.push([d, o, h, l, c, isNaN(v) ? 0 : v]);
  }
  return rows;
}

async function insertRows(symbol, rows) {
  const BATCH = 2000;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let n = 1;
    for (const [d, o, h, l, c, v] of chunk) {
      values.push(`($${n++}, $${n++}::date, $${n++}, $${n++}, $${n++}, $${n++}, $${n++}::bigint)`);
      params.push(symbol, d, o, h, l, c, v);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO stock_eod (symbol, d, o, h, l, c, v) VALUES ${values.join(',')}
       ON CONFLICT (symbol, d) DO NOTHING`,
      ...params,
    );
    total += chunk.length;
  }
  return total;
}

async function backfillSensex() {
  // Yahoo ^BSESN — one-shot full history, with retries.
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=max';
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const r = j?.chart?.result?.[0];
      if (!r?.timestamp?.length) throw new Error('empty payload');
      const q = r.indicators.quote[0];
      const rows = [];
      for (let i = 0; i < r.timestamp.length; i++) {
        const c = q.close?.[i];
        if (!(c > 0)) continue;
        const d = new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10);
        rows.push([d, q.open?.[i] ?? c, q.high?.[i] ?? c, q.low?.[i] ?? c, c, Math.round(q.volume?.[i] || 0)]);
      }
      const n = await insertRows('SENSEX', rows);
      console.log(`  SENSEX — ${n} rows (Yahoo ^BSESN)`);
      return;
    } catch (e) {
      console.log(`  SENSEX attempt ${attempt} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  console.log('  SENSEX — FAILED (re-run later)');
}

const entries = Object.entries(INDEXES).filter(([sym]) => !only.length || only.includes(sym));
console.log(`Backfilling ${entries.length} official NSE index series…`);
let loaded = 0;
for (const [sym, file] of entries) {
  try {
    const res = await fetch(`${RAW}/${encodeURIComponent(file)}.csv`);
    if (!res.ok) { console.log(`  ${sym} — HTTP ${res.status}, skipped`); continue; }
    const rows = parseIndexCsv(await res.text());
    const n = await insertRows(sym, rows);
    loaded++;
    console.log(`  ${sym} — ${n} rows`);
  } catch (e) {
    console.log(`  ${sym} — FAILED: ${e.message}`);
  }
}
if (!only.length || only.includes('SENSEX')) await backfillSensex();
console.log(`Done. ${loaded} NSE index series loaded.`);
await prisma.$disconnect();
