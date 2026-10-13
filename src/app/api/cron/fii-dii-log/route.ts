import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel calls this several times each evening and once next morning (see
// vercel.json). NSE's cash API only ever returns the latest session and often
// publishes after 7 PM IST, so a single early run lost that day for good; the
// repeated runs (and the 8 AM catch-up, before the next session replaces it)
// make sure every session is captured. Upserts make repeat runs harmless.
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

const FNO_LOOKBACK_DAYS = 10;

/** Weekdays in the last N calendar days, in IST, as NSE archive file keys + our date labels. */
function recentWeekdays(n: number) {
  const out: { file: string; label: string }[] = [];
  const nowIst = new Date(Date.now() + 5.5 * 3600_000);
  for (let i = 0; i < n; i++) {
    const d = new Date(nowIst);
    d.setUTCDate(nowIst.getUTCDate() - i);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    out.push({ file: `${dd}${mm}${yyyy}`, label: `${dd}-${MONTHS[d.getUTCMonth()]}-${yyyy}` });
  }
  return out;
}

async function fetchFnoDay(file: string, label: string): Promise<FnoRow | null> {
  try {
    const res = await fetch(`https://archives.nseindia.com/content/nsccl/fao_participant_oi_${file}.csv`, {
      headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return parseFnoCsv(await res.text(), label);
  } catch {
    return null;
  }
}

// NSE keeps every participant-OI file permanently, so each run re-checks the
// recent window and fills any session we don't have yet (holidays simply 404).
async function fetchMissingFno(days = FNO_LOOKBACK_DAYS): Promise<FnoRow[]> {
  const candidates = recentWeekdays(days);
  const have = new Set(
    (await prisma.fnoLog.findMany({ where: { date: { in: candidates.map((c) => c.label) } }, select: { date: true } })).map((r) => r.date),
  );
  // Always re-fetch the newest weekday too, in case it was stored before NSE finalised it.
  const todo = candidates.filter((c, i) => i === 0 || !have.has(c.label));
  const rows = await Promise.all(todo.map((c) => fetchFnoDay(c.file, c.label)));
  return rows.filter((r): r is FnoRow => r !== null);
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

  // 2. F&O OI — store every recent session that is missing
  try {
    const days = Number(new URL(request.url).searchParams.get('fnoDays')) || FNO_LOOKBACK_DAYS;
    const found = await fetchMissingFno(Math.min(days, 400));
    for (const fno of found) {
      const { date, ...values } = fno;
      await prisma.fnoLog.upsert({ where: { date }, update: values, create: fno });
    }
    results.fno = found.length
      ? { stored: true, dates: found.map((f) => f.date) }
      : { stored: false, reason: 'No new NSE archive files in the lookback window' };
  } catch (e) {
    results.fno = { stored: false, error: (e as Error).message };
  }

  return NextResponse.json({ ok: true, ...results });
}
