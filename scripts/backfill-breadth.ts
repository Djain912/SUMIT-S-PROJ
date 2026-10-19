// One-time (re-runnable) backfill of Nifty 500 closes + breadth history.
//   npx tsx scripts/backfill-breadth.ts [startDate=2023-07-01]
// Skips days already stored, so it can be resumed safely.

import { readFileSync } from 'fs';
for (const line of readFileSync('.env', 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const e = t.indexOf('=');
  if (e < 0) continue;
  process.env[t.slice(0, e).trim()] = t.slice(e + 1).trim().replace(/^["']|["']$/g, '');
}

const { prisma } = await import('../src/lib/db/prisma');
const { fetchBhavcopy } = await import('../src/lib/breadth/bhavcopy');
const { getUniverse, storeDay, computeAndStore, weekdaysBetween, istToday } = await import('../src/lib/breadth/update');

const start = process.argv[2] ?? '2023-07-01';
const { symbols, industries } = await getUniverse();
console.log(`Nifty 500 universe: ${symbols.size} symbols`);

const have = new Set((await prisma.stockDaily.findMany({ distinct: ['date'], select: { date: true } })).map((r) => r.date));
const days = weekdaysBetween(new Date(Date.parse(start) - 86400_000).toISOString().slice(0, 10), istToday()).filter((d) => !have.has(d));
console.log(`${days.length} weekdays to fetch (${have.size} already stored)`);

let done = 0, stored = 0, missing = 0;
const queue = [...days];
async function worker() {
  while (queue.length) {
    const d = queue.shift()!;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const rows = await fetchBhavcopy(d);
        if (rows) stored += (await storeDay(d, rows, symbols)) ? 1 : 0;
        else missing++;
        break;
      } catch (e) {
        if (attempt === 3) console.log(`  ! ${d}: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (++done % 50 === 0) console.log(`  ${done}/${days.length} (stored ${stored}, holidays/missing ${missing})`);
    await new Promise((r) => setTimeout(r, 150));
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log(`Fetched: ${stored} trading days stored, ${missing} holidays/missing`);

console.log('Computing breadth history…');
await prisma.breadthDaily.deleteMany({});
const rows = await computeAndStore(null, industries);
const withPct = rows.filter((r) => r.pctAbove200 != null);
console.log(`Breadth rows: ${rows.length} (with 200-day readings from ${withPct[0]?.date})`);
console.log('Latest:', JSON.stringify(rows.at(-1), (k, v) => (k === 'sectors' ? `[${v?.length} sectors]` : v)));
await prisma.$disconnect();
