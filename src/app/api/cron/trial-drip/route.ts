import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { computeTrialState } from '@/lib/trial';
import { sendTrialNudgeEmail, sendTrialUrgencyEmail } from '@/lib/email/welcome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel calls this daily at 9:00 AM IST (03:30 UTC).
// Sends targeted drip emails to trial users based on which day of their trial
// they're on and whether they've engaged. Uses `lastDripDay` (stored on
// UserActivity) as an idempotency key — we never send the same drip twice.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Fetch all active trial users with their activity record.
  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'TRIAL',
      trialExpiresAt: { gt: now },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      trialStartedAt: true,
      trialExpiresAt: true,
      activity: {
        select: {
          lastDripDay: true,
          chaptersViewed: true,
        },
      },
    },
  });

  let nudgeSent = 0;
  let urgencySent = 0;
  let skipped = 0;

  for (const user of users) {
    const trial = computeTrialState(user.trialStartedAt, user.trialExpiresAt, now);
    if (!trial.inTrial) { skipped++; continue; }

    const lastDripDay = user.activity?.lastDripDay ?? 0;
    const chaptersViewed = (user.activity?.chaptersViewed as string[]) ?? [];
    const hasOpenedAnything = chaptersViewed.length > 0;

    let sent = false;

    // Day 3 nudge — only if they haven't opened any chapter yet
    if (trial.dayOfTrial >= 3 && lastDripDay < 3 && !hasOpenedAnything) {
      try {
        await sendTrialNudgeEmail(user.email, user.fullName, trial.daysRemaining);
        nudgeSent++;
        sent = true;
        await upsertLastDripDay(user.id, 3);
      } catch (err) {
        console.error(`[trial-drip] nudge failed for ${user.email}:`, err);
      }
    }

    // Day 6 urgency — send to everyone still on trial, regardless of engagement
    if (!sent && trial.dayOfTrial >= 6 && lastDripDay < 6) {
      try {
        await sendTrialUrgencyEmail(user.email, user.fullName);
        urgencySent++;
        await upsertLastDripDay(user.id, 6);
      } catch (err) {
        console.error(`[trial-drip] urgency failed for ${user.email}:`, err);
      }
    }

    if (!sent && (trial.dayOfTrial < 3 || (trial.dayOfTrial >= 3 && hasOpenedAnything && trial.dayOfTrial < 6))) {
      skipped++;
    }
  }

  console.log(`[trial-drip] done — nudge:${nudgeSent} urgency:${urgencySent} skipped:${skipped}`);
  return NextResponse.json({ ok: true, nudgeSent, urgencySent, skipped });
}

async function upsertLastDripDay(userId: string, day: number) {
  await prisma.userActivity.upsert({
    where: { userId },
    update: { lastDripDay: day },
    create: {
      userId,
      lastDripDay: day,
    },
  });
}
