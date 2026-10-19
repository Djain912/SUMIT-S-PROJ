import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { runMarketDesk } from '@/lib/observations/run';
import { sendDeskTranche } from '@/lib/observations/telegram';

export const maxDuration = 60;

// Market Desk schedule (vercel.json, times IST):
//   6:00 AM  (no task)          generate the morning desk — 4 posts, nothing sent yet
//   8:30 AM  task=send&tranche=1  Telegram: top 2 morning posts
//   1:00 PM  task=send&tranche=2  Telegram: next 2 morning posts
//   9:00 PM  task=evening         weekdays: generate 2 fresh posts from today's close
//                                 (breadth, FII/DII, closes) and send them
const MORNING_POSTS = 4;
const EVENING_POSTS = 2;
const TRANCHES: Record<string, string> = { '1': 'Morning tranche', '2': 'Midday tranche' };

async function ensureMorning(today: string) {
  const existing = await prisma.marketObservation.count({ where: { date: today, OR: [{ slot: 'morning' }, { slot: null }] } });
  if (existing > 0) return { skipped: true, existing };
  return runMarketDesk(today, { slot: 'morning', maxPosts: MORNING_POSTS });
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const task = url.searchParams.get('task') ?? 'generate';
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (task === 'generate') {
      return NextResponse.json({ date: today, morning: await ensureMorning(today) });
    }
    if (task === 'send') {
      const tranche = url.searchParams.get('tranche') ?? '1';
      // If the 6 AM run failed, generate now so the tranche still goes out.
      const morning = await ensureMorning(today);
      const telegram = await sendDeskTranche(today, 'morning', 2, TRANCHES[tranche] ?? 'Tranche');
      return NextResponse.json({ date: today, tranche, morning, telegram });
    }
    if (task === 'evening') {
      const existing = await prisma.marketObservation.count({ where: { date: today, slot: 'evening' } });
      const evening = existing ? { skipped: true, existing } : await runMarketDesk(today, { slot: 'evening', maxPosts: EVENING_POSTS });
      const telegram = await sendDeskTranche(today, 'evening', EVENING_POSTS, 'Evening tranche · after the close');
      return NextResponse.json({ date: today, evening, telegram });
    }
    return NextResponse.json({ error: `Unknown task ${task}` }, { status: 400 });
  } catch (err) {
    console.error(`[cron/market-observations] ${task} failed:`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 502 });
  }
}
