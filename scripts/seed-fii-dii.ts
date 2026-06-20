/**
 * One-shot script to manually seed today's FII/DII data into Neon.
 * Run: npx tsx scripts/seed-fii-dii.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const NSE_HOME = 'https://www.nseindia.com/reports-indices-fii-dii-trading-activity';
const NSE_API  = 'https://www.nseindia.com/api/fiidiiTradeReact';
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function fetchCash() {
  const headers: Record<string,string> = {
    'User-Agent': UA, Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9', Referer: NSE_HOME,
  };
  const boot = await fetch(NSE_HOME, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(12000) });
  const cookies = boot.headers.getSetCookie?.() ?? [];
  if (cookies.length) headers.Cookie = cookies.map((c: string) => c.split(';')[0]).join('; ');

  const res = await fetch(NSE_API, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`NSE ${res.status}`);
  const raw = await res.json() as Array<{ category?: string; date?: string; buyValue?: string | number; sellValue?: string | number; netValue?: string | number }>;
  if (!Array.isArray(raw) || !raw.length) throw new Error('Empty payload');

  const n = (v: string | number | undefined) => parseFloat(String(v ?? 0).replace(/,/g, '')) || 0;
  let date = '', fiiBuy = 0, fiiSell = 0, fiiNet = 0, diiBuy = 0, diiSell = 0, diiNet = 0;
  for (const r of raw) {
    const cat = (r.category ?? '').toUpperCase();
    if (cat.includes('FII') || cat.includes('FPI')) {
      fiiBuy = n(r.buyValue); fiiSell = n(r.sellValue); fiiNet = n(r.netValue);
      const p = (r.date ?? '').split('-');
      if (p.length === 3) {
        const mon = MONTHS.indexOf(p[1]);
        date = mon >= 0 ? `${p[2]}-${String(mon+1).padStart(2,'0')}-${p[0].padStart(2,'0')}` : (r.date ?? '');
      }
    } else if (cat.includes('DII')) {
      diiBuy = n(r.buyValue); diiSell = n(r.sellValue); diiNet = n(r.netValue);
    }
  }
  if (!date) throw new Error('Missing date in payload');
  return { date, fiiBuy, fiiSell, fiiNet, diiBuy, diiSell, diiNet };
}

async function fetchFno() {
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const label = `${dd}-${MONTHS[d.getMonth()]}-${yyyy}`;
    const url = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const csv = await res.text();
      const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
      let fiiIdxFutLong=0,fiiIdxFutShort=0,fiiStkFutLong=0,fiiStkFutShort=0;
      let fiiIdxCallLong=0,fiiIdxCallShort=0,fiiIdxPutLong=0,fiiIdxPutShort=0;
      let diiIdxFutLong=0,diiIdxFutShort=0,diiStkFutLong=0,diiStkFutShort=0;
      let diiIdxCallLong=0,diiIdxCallShort=0,diiIdxPutLong=0,diiIdxPutShort=0;
      let found = false;
      const nf = (v: string|undefined) => parseFloat(String(v??0).replace(/,/g,'').trim())||0;
      for (const line of lines) {
        const c = line.split(',');
        const t = (c[0]??'').trim().toUpperCase();
        if (t.includes('FII')||t.includes('FPI')) {
          found=true;
          fiiIdxFutLong=nf(c[1]);fiiIdxFutShort=nf(c[2]);fiiStkFutLong=nf(c[3]);fiiStkFutShort=nf(c[4]);
          fiiIdxCallLong=nf(c[5]);fiiIdxPutLong=nf(c[6]);fiiIdxCallShort=nf(c[7]);fiiIdxPutShort=nf(c[8]);
        } else if (t.includes('DII')) {
          found=true;
          diiIdxFutLong=nf(c[1]);diiIdxFutShort=nf(c[2]);diiStkFutLong=nf(c[3]);diiStkFutShort=nf(c[4]);
          diiIdxCallLong=nf(c[5]);diiIdxPutLong=nf(c[6]);diiIdxCallShort=nf(c[7]);diiIdxPutShort=nf(c[8]);
        }
      }
      if (!found || fiiIdxFutLong+fiiIdxFutShort===0) continue;
      return { date:label, fiiIdxFutLong,fiiIdxFutShort,fiiStkFutLong,fiiStkFutShort,
        fiiIdxCallLong,fiiIdxCallShort,fiiIdxPutLong,fiiIdxPutShort,
        diiIdxFutLong,diiIdxFutShort,diiStkFutLong,diiStkFutShort,
        diiIdxCallLong,diiIdxCallShort,diiIdxPutLong,diiIdxPutShort };
    } catch { continue; }
  }
  return null;
}

async function main() {
  console.log('Seeding FII/DII data into Neon...\n');

  // Cash
  try {
    const cash = await fetchCash();
    console.log(`Cash data: date=${cash.date}  FII net=${cash.fiiNet}  DII net=${cash.diiNet}`);
    await prisma.fiiDiiLog.upsert({
      where: { date: cash.date },
      update: { fiiBuy:cash.fiiBuy, fiiSell:cash.fiiSell, fiiNet:cash.fiiNet, diiBuy:cash.diiBuy, diiSell:cash.diiSell, diiNet:cash.diiNet },
      create: { date:cash.date, fiiBuy:cash.fiiBuy, fiiSell:cash.fiiSell, fiiNet:cash.fiiNet, diiBuy:cash.diiBuy, diiSell:cash.diiSell, diiNet:cash.diiNet },
    });
    console.log('✓ Cash row upserted\n');
  } catch(e) { console.error('✗ Cash failed:', (e as Error).message, '\n'); }

  // F&O
  try {
    const fno = await fetchFno();
    if (!fno) { console.log('⚠ F&O archive not yet published by NSE (normal before ~5 PM IST)\n'); }
    else {
      console.log(`F&O data: date=${fno.date}  FII idx fut long=${fno.fiiIdxFutLong}`);
      await prisma.fnoLog.upsert({
        where: { date: fno.date },
        update: { ...fno },
        create: { ...fno },
      });
      console.log('✓ F&O row upserted\n');
    }
  } catch(e) { console.error('✗ F&O failed:', (e as Error).message, '\n'); }

  // Verify what's in DB
  const count = await prisma.fiiDiiLog.count();
  const latest = await prisma.fiiDiiLog.findFirst({ orderBy: { date: 'desc' } });
  console.log(`DB now has ${count} cash row(s). Latest: ${latest?.date}  FII net: ${latest?.fiiNet}  DII net: ${latest?.diiNet}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
