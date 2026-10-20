import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { pruneOldPosts, runMarketDesk } from '@/lib/observations/run';
import { sendDeskTranche } from '@/lib/observations/telegram';

export const maxDuration = 60;

// Market Desk schedule (vercel.json, times IST):
//   6:00 AM  (no task)          generate the morning desk — 6 posts, nothing sent yet
//   8:30 AM  task=send&tranche=1  Telegram: first 3 morning posts
//   1:00 PM  task=send&tranche=2  Telegram: every remaining morning post
//   9:00 PM  task=evening         weekdays: generate 3 fresh posts from today's close
//                                 (breadth, FII/DII, closes) and send them all
const MORNING_POSTS = 6;
const EVENING_POSTS = 3;
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
      const pruned = await pruneOldPosts(today).catch(() => 0);
      return NextResponse.json({ date: today, morning: await ensureMorning(today), pruned });
    }
    if (task === 'send') {
      const tranche = url.searchParams.get('tranche') ?? '1';
      // If the 6 AM run failed, generate now so the tranche still goes out.
      const morning = await ensureMorning(today);
      // Tranche 1 sends half; the last tranche sends everything still unsent.
      const count = tranche === '1' ? Math.ceil(MORNING_POSTS / 2) : MORNING_POSTS;
      const telegram = await sendDeskTranche(today, 'morning', count, TRANCHES[tranche] ?? 'Tranche');
      // A missing Telegram config must show up as a failed cron in Vercel's logs, not a silent skip.
      const notConfigured = 'skipped' in telegram && telegram.skipped === 'Telegram not configured';
      if (notConfigured) console.error('[cron/market-observations] Telegram env vars missing on this deployment');
      return NextResponse.json({ date: today, tranche, morning, telegram }, { status: notConfigured ? 500 : 200 });
    }
    if (task === 'evening') {
      const existing = await prisma.marketObservation.count({ where: { date: today, slot: 'evening' } });
      const evening = existing ? { skipped: true, existing } : await runMarketDesk(today, { slot: 'evening', maxPosts: EVENING_POSTS });
      const telegram = await sendDeskTranche(today, 'evening', EVENING_POSTS, 'Evening tranche · after the close');
      const notConfigured = 'skipped' in telegram && telegram.skipped === 'Telegram not configured';
      if (notConfigured) console.error('[cron/market-observations] Telegram env vars missing on this deployment');
      return NextResponse.json({ date: today, evening, telegram }, { status: notConfigured ? 500 : 200 });
    }
    return NextResponse.json({ error: `Unknown task ${task}` }, { status: 400 });
  } catch (err) {
    console.error(`[cron/market-observations] ${task} failed:`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 502 });
  }
}
