// Backfill missing FnoLog entries from NSE archive.
// Run locally (not from Vercel) — NSE archive requires a real IP, not cloud.
//
// Usage: node scripts/backfill-fno-log.mjs [YYYY-MM-DD] [YYYY-MM-DD]
//   Defaults to the last 30 trading days if no dates given.

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/) || line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(\S*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const prisma = new PrismaClient();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function numF(v) { return parseFloat(String(v ?? 0).replace(/,/g, '').trim()) || 0; }

function parseFnoCsv(csv, label) {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  const row = {
    date: label,
    fiiIdxFutLong: 0, fiiIdxFutShort: 0, fiiStkFutLong: 0, fiiStkFutShort: 0,
    fiiIdxCallLong: 0, fiiIdxCallShort: 0, fiiIdxPutLong: 0, fiiIdxPutShort: 0,
    diiIdxFutLong: 0, diiIdxFutShort: 0, diiStkFutLong: 0, diiStkFutShort: 0,
    diiIdxCallLong: 0, diiIdxCallShort: 0, diiIdxPutLong: 0, diiIdxPutShort: 0,
  };
  let found = false;
  for (const line of lines) {
    const cols = line.split(',');
    const type = (cols[0] ?? '').trim().toUpperCase();
    const isFii = type.includes('FII') || type.includes('FPI');
    const isDii = type.includes('DII');
    if (!isFii && !isDii) continue;
    found = true;
    if (isFii) {
      row.fiiIdxFutLong = numF(cols[1]); row.fiiIdxFutShort = numF(cols[2]);
      row.fiiStkFutLong = numF(cols[3]); row.fiiStkFutShort = numF(cols[4]);
      row.fiiIdxCallLong = numF(cols[5]); row.fiiIdxPutLong = numF(cols[6]);
      row.fiiIdxCallShort = numF(cols[7]); row.fiiIdxPutShort = numF(cols[8]);
    } else {
      row.diiIdxFutLong = numF(cols[1]); row.diiIdxFutShort = numF(cols[2]);
      row.diiStkFutLong = numF(cols[3]); row.diiStkFutShort = numF(cols[4]);
      row.diiIdxCallLong = numF(cols[5]); row.diiIdxPutLong = numF(cols[6]);
      row.diiIdxCallShort = numF(cols[7]); row.diiIdxPutShort = numF(cols[8]);
    }
  }
  if (!found || row.fiiIdxFutLong + row.fiiIdxFutShort === 0) return null;
  return row;
}

async function fetchOneDay(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const label = `${dd}-${MONTHS[d.getMonth()]}-${yyyy}`;
  const url = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const csv = await res.text();
    return parseFnoCsv(csv, label);
  } catch { return null; }
}

async function main() {
  // Date range: from arg or from last stored date to today
  let fromDate, toDate;
  if (process.argv[2] && process.argv[3]) {
    fromDate = new Date(process.argv[2]);
    toDate = new Date(process.argv[3]);
  } else {
    // Find last stored date and go from there
    const latest = await prisma.fnoLog.findFirst({ orderBy: { date: 'desc' } });
    // latest.date is like "31-Jul-2026"
    fromDate = latest ? new Date(latest.date.replace(/(\d+)-(\w+)-(\d+)/, '$1 $2 $3')) : new Date('2026-08-01');
    fromDate.setDate(fromDate.getDate() + 1); // start from day after last stored
    toDate = new Date();
  }

  console.log(`Backfilling FnoLog from ${fromDate.toDateString()} to ${toDate.toDateString()}...`);

  let stored = 0, skipped = 0, missing = 0;

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // skip weekends

    const row = await fetchOneDay(new Date(d));
    if (!row) {
      console.log(`  ${d.toDateString()} → no data (holiday or NSE not published)`);
      missing++;
      continue;
    }

    await prisma.fnoLog.upsert({
      where: { date: row.date },
      update: {
        fiiIdxFutLong: row.fiiIdxFutLong, fiiIdxFutShort: row.fiiIdxFutShort,
        fiiStkFutLong: row.fiiStkFutLong, fiiStkFutShort: row.fiiStkFutShort,
        fiiIdxCallLong: row.fiiIdxCallLong, fiiIdxCallShort: row.fiiIdxCallShort,
        fiiIdxPutLong: row.fiiIdxPutLong, fiiIdxPutShort: row.fiiIdxPutShort,
        diiIdxFutLong: row.diiIdxFutLong, diiIdxFutShort: row.diiIdxFutShort,
        diiStkFutLong: row.diiStkFutLong, diiStkFutShort: row.diiStkFutShort,
        diiIdxCallLong: row.diiIdxCallLong, diiIdxCallShort: row.diiIdxCallShort,
        diiIdxPutLong: row.diiIdxPutLong, diiIdxPutShort: row.diiIdxPutShort,
      },
      create: { ...row },
    });
    console.log(`  ${row.date} → stored (FII idx net: ${row.fiiIdxFutLong - row.fiiIdxFutShort})`);
    stored++;

    // Small delay to be polite to NSE
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone. Stored: ${stored} | No data: ${missing}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
