import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { runMarketDesk } from '@/lib/observations/run';

export const maxDuration = 60;

// Daily Market Desk run (vercel.json: 00:30 UTC = 6:00 AM IST).
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Idempotent — skip if already generated today
  const existing = await prisma.marketObservation.count({ where: { date: today } });
  if (existing > 0) {
    return NextResponse.json({ skipped: true, date: today, existing });
  }

  try {
    const result = await runMarketDesk(today);
    return NextResponse.json({ ...result, date: today });
  } catch (err) {
    console.error('[cron/market-observations] failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 502 });
  }
}
