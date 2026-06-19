import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Vercel calls this at 6:30 PM IST (13:00 UTC) Mon–Fri.
// It fetches the day's FII/DII cash + F&O data from NSE and upserts
// into Neon so we build a permanent historical record automatically.
// Protected by CRON_SECRET — Vercel sends it as Authorization: Bearer <secret>.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const NSE_HOME = 'https://www.nseindia.com/reports-indices-fii-dii-trading-activity';
const NSE_API  = 'https://www.nseindia.com/api/fiidiiTradeReact';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Cash segment ────────────────────────────────────────────────────────────

type CashRow = {
  date: string;   // YYYY-MM-DD
  fiiBuy: number; fiiSell: number; fiiNet: number;
  diiBuy: number; diiSell: number; diiNet: number;
};

async function fetchCash(): Promise<CashRow> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: NSE_HOME,
  };
  const boot = await fetch(NSE_HOME, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  const cookies = boot.headers.getSetCookie?.() ?? [];
  if (cookies.length) headers.Cookie = cookies.map((c) => c.split(';')[0]).join('; ');

  const res = await fetch(NSE_API, { headers, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`NSE cash API ${res.status}`);

  const raw = await res.json() as Array<{
    category?: string; date?: string;
    buyValue?: string | number; sellValue?: string | number; netValue?: string | number;
  }>;
  if (!Array.isArray(raw) || !raw.length) throw new Error('NSE cash payload empty');

  const n = (v: string | number | undefined) => parseFloat(String(v ?? 0).replace(/,/g, '')) || 0;
  const row: CashRow = { date: '', fiiBuy: 0, fiiSell: 0, fiiNet: 0, diiBuy: 0, diiSell: 0, diiNet: 0 };
  for (const r of raw) {
    const cat = (r.category ?? '').toUpperCase();
    if (cat.includes('FII') || cat.includes('FPI')) {
      row.fiiBuy = n(r.buyValue); row.fiiSell = n(r.sellValue); row.fiiNet = n(r.netValue);
      // NSE returns dates like "19-Jun-2026" — normalise to YYYY-MM-DD
      const parts = (r.date ?? '').split('-');
      if (parts.length === 3) {
        const mon = MONTHS.indexOf(parts[1]);
        row.date = mon >= 0
          ? `${parts[2]}-${String(mon + 1).padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          : (r.date ?? '');
      }
    } else if (cat.includes('DII')) {
      row.diiBuy = n(r.buyValue); row.diiSell = n(r.sellValue); row.diiNet = n(r.netValue);
    }
  }
  if (!row.date) throw new Error('Cash payload missing date');
  return row;
}

// ── F&O participant OI ────────────────────────────────────────────────────

type FnoRow = {
  date: string;
  fiiIdxFutLong: number; fiiIdxFutShort: number;
  fiiStkFutLong: number; fiiStkFutShort: number;
  fiiIdxCallLong: number; fiiIdxCallShort: number;
  fiiIdxPutLong: number; fiiIdxPutShort: number;
  diiIdxFutLong: number; diiIdxFutShort: number;
  diiStkFutLong: number; diiStkFutShort: number;
  diiIdxCallLong: number; diiIdxCallShort: number;
  diiIdxPutLong: number; diiIdxPutShort: number;
};

const numF = (v: string | undefined) => parseFloat(String(v ?? 0).replace(/,/g, '').trim()) || 0;

function parseFnoCsv(csv: string, date: string): FnoRow | null {
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const row: FnoRow = {
    date,
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
    const set = (k: keyof FnoRow, v: string | undefined) => { (row as Record<string, number | string>)[k] = numF(v); };
    if (isFii) {
      set('fiiIdxFutLong', cols[1]); set('fiiIdxFutShort', cols[2]);
      set('fiiStkFutLong', cols[3]); set('fiiStkFutShort', cols[4]);
      set('fiiIdxCallLong', cols[5]); set('fiiIdxPutLong', cols[6]);
      set('fiiIdxCallShort', cols[7]); set('fiiIdxPutShort', cols[8]);
    } else {
      set('diiIdxFutLong', cols[1]); set('diiIdxFutShort', cols[2]);
      set('diiStkFutLong', cols[3]); set('diiStkFutShort', cols[4]);
      set('diiIdxCallLong', cols[5]); set('diiIdxPutLong', cols[6]);
      set('diiIdxCallShort', cols[7]); set('diiIdxPutShort', cols[8]);
    }
  }
  if (!found || row.fiiIdxFutLong + row.fiiIdxFutShort === 0) return null;
  return row;
}

async function fetchFno(): Promise<FnoRow | null> {
  const today = new Date();
  // Try today and yesterday (NSE archives update same-day but sometimes lag)
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const label = `${dd}-${MONTHS[d.getMonth()]}-${yyyy}`;
    const url = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const csv = await res.text();
      const parsed = parseFnoCsv(csv, label);
      if (parsed) return parsed;
    } catch { continue; }
  }
  return null;
}

// ── Handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify Vercel cron secret (set CRON_SECRET in Vercel env vars)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results: Record<string, unknown> = {};

  // 1. Cash segment
  try {
    const cash = await fetchCash();
    await prisma.fiiDiiLog.upsert({
      where: { date: cash.date },
      update: {
        fiiBuy: cash.fiiBuy, fiiSell: cash.fiiSell, fiiNet: cash.fiiNet,
        diiBuy: cash.diiBuy, diiSell: cash.diiSell, diiNet: cash.diiNet,
      },
      create: {
        date: cash.date,
        fiiBuy: cash.fiiBuy, fiiSell: cash.fiiSell, fiiNet: cash.fiiNet,
        diiBuy: cash.diiBuy, diiSell: cash.diiSell, diiNet: cash.diiNet,
      },
    });
    results.cash = { stored: true, date: cash.date, fiiNet: cash.fiiNet, diiNet: cash.diiNet };
  } catch (e) {
    results.cash = { stored: false, error: (e as Error).message };
  }

  // 2. F&O OI
  try {
    const fno = await fetchFno();
    if (fno) {
      await prisma.fnoLog.upsert({
        where: { date: fno.date },
        update: {
          fiiIdxFutLong: fno.fiiIdxFutLong, fiiIdxFutShort: fno.fiiIdxFutShort,
          fiiStkFutLong: fno.fiiStkFutLong, fiiStkFutShort: fno.fiiStkFutShort,
          fiiIdxCallLong: fno.fiiIdxCallLong, fiiIdxCallShort: fno.fiiIdxCallShort,
          fiiIdxPutLong: fno.fiiIdxPutLong, fiiIdxPutShort: fno.fiiIdxPutShort,
          diiIdxFutLong: fno.diiIdxFutLong, diiIdxFutShort: fno.diiIdxFutShort,
          diiStkFutLong: fno.diiStkFutLong, diiStkFutShort: fno.diiStkFutShort,
          diiIdxCallLong: fno.diiIdxCallLong, diiIdxCallShort: fno.diiIdxCallShort,
          diiIdxPutLong: fno.diiIdxPutLong, diiIdxPutShort: fno.diiIdxPutShort,
        },
        create: { ...fno },
      });
      results.fno = { stored: true, date: fno.date };
    } else {
      results.fno = { stored: false, reason: 'NSE archive not yet published' };
    }
  } catch (e) {
    results.fno = { stored: false, error: (e as Error).message };
  }

  return NextResponse.json({ ok: true, ...results });
}
