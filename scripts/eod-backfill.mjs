// One-time backfill: pull full EOD history for every index-library constituent
// from the eod2_data GitHub dataset (official-grade, matches NSE bhavcopy) into a
// standalone `stock_eod` table in Neon. Idempotent — safe to re-run.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const prisma = new PrismaClient();
const RAW = 'https://raw.githubusercontent.com/BennyThadikaran/eod2_data/main/daily';

const lib = JSON.parse(readFileSync(
  new URL('../public/index-builder-app/data/sectorIndices.json', import.meta.url)));
// Symbols whose dataset filename differs from the lowercased ticker (renames etc.)
const ALIAS = { ZOMATO: 'eternal', SUVENPHAR: 'suven', IIFLSEC: 'iifl' };
// Optional CLI args restrict the run to specific tickers (idempotent retry).
const only = process.argv.slice(2).map((s) => s.toUpperCase());
const allTickers = [...new Set(Object.values(lib).flatMap((v) => v.constituents))].sort();
const tickers = only.length ? allTickers.filter((t) => only.includes(t)) : allTickers;

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS stock_eod (
      symbol text NOT NULL,
      d      date NOT NULL,
      o      double precision,
      h      double precision,
      l      double precision,
      c      double precision,
      v      bigint,
      PRIMARY KEY (symbol, d)
    )`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS stock_eod_symbol_d ON stock_eod (symbol, d)`);
}

function parseCsv(text) {
  const rows = [];
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) continue;
    const p = ln.split(',');
    // Date,Open,High,Low,Close,Volume,Series,...
    if (p[6] && p[6] !== 'EQ') continue;          // equity series only
    const d = p[0];
    const o = +p[1], h = +p[2], l = +p[3], c = +p[4], v = parseInt(p[5] || '0', 10);
    if (!d || !(c > 0)) continue;
    rows.push([d, o, h, l, c, isNaN(v) ? 0 : v]);
  }
  return rows;
}

async function insertRows(symbol, rows) {
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const vals = [];
    const params = [];
    let n = 1;
    for (const [d, o, h, l, c, v] of slice) {
      vals.push(`($${n++},$${n++}::date,$${n++},$${n++},$${n++},$${n++},$${n++}::bigint)`);
      params.push(symbol, d, o, h, l, c, v);
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO stock_eod (symbol,d,o,h,l,c,v) VALUES ${vals.join(',')}
       ON CONFLICT (symbol,d) DO NOTHING`, ...params);
  }
}

async function main() {
  await ensureTable();
  console.log(`Backfilling ${tickers.length} tickers from eod2_data…\n`);
  let ok = 0, miss = 0, totalRows = 0;
  const missing = [];
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    const file = (ALIAS[t] || t.toLowerCase()) + '.csv';
    try {
      const res = await fetch(`${RAW}/${encodeURIComponent(file)}`);
      if (!res.ok) { miss++; missing.push(t); continue; }
      const rows = parseCsv(await res.text());
      if (!rows.length) { miss++; missing.push(t); continue; }
      await insertRows(t, rows);
      ok++; totalRows += rows.length;
    } catch (e) {
      miss++; missing.push(`${t}(${e.message})`);
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${tickers.length} — ${ok} loaded, ${totalRows.toLocaleString()} rows`);
  }
  console.log(`\nDone. ${ok} tickers loaded, ${totalRows.toLocaleString()} rows total.`);
  if (missing.length) console.log(`\n${missing.length} not found in dataset:\n  ${missing.join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
