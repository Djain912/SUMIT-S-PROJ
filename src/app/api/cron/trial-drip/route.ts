import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { computeTrialState } from '@/lib/trial';
import { sendTrialNudgeEmail, sendTrialUrgencyEmail } from '@/lib/email/welcome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel calls this daily at 9:00 AM IST (03:30 UTC).
// Sends targeted drip emails to trial users based on which day of their trial
// they're on and whether they've engaged. Uses LevelTrial.lastDripDay as an
// idempotency key (per level-trial, not per user) — we never send the same
// drip twice for the same trial.
//
// A user can hold two simultaneously active trials (e.g. Level 1 mid-trial,
// then starts Level 2). We still cap at ONE drip email per user per run —
// whichever trial is checked first wins; the other trial's lastDripDay stays
// behind and it catches up on the next run.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const trials = await prisma.levelTrial.findMany({
    where: { expiresAt: { gt: now } },
    select: {
      id: true,
      level: true,
      startedAt: true,
      expiresAt: true,
      lastDripDay: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isPremium: true,
          premiumUntil: true,
          activity: { select: { chaptersViewed: true } },
        },
      },
    },
  });

  let nudgeSent = 0;
  let urgencySent = 0;
  let skipped = 0;
  const emailedUserIds = new Set<string>();

  for (const t of trials) {
    // Already emailed this user once in this run (they hold another active trial).
    if (emailedUserIds.has(t.user.id)) { skipped++; continue; }

    // Skip anyone who's since bought or is an admin — no "your trial is
    // ending" emails to someone who already has full access.
    const full = t.user.role === 'ADMIN' || (t.user.isPremium && (!t.user.premiumUntil || t.user.premiumUntil > now));
    if (full) { skipped++; continue; }

    const trial = computeTrialState(t.startedAt, t.expiresAt, now);
    if (!trial.inTrial) { skipped++; continue; }

    const lastDripDay = t.lastDripDay ?? 0;
    const chaptersViewed = (t.user.activity?.chaptersViewed as string[]) ?? [];
    const hasOpenedAnything = chaptersViewed.length > 0;

    let sent = false;

    // Day 3 nudge — only if they haven't opened any chapter yet
    if (trial.dayOfTrial >= 3 && lastDripDay < 3 && !hasOpenedAnything) {
      try {
        await sendTrialNudgeEmail(t.user.email, t.user.fullName, trial.daysRemaining);
        nudgeSent++;
        sent = true;
        await prisma.levelTrial.update({ where: { id: t.id }, data: { lastDripDay: 3 } });
      } catch (err) {
        console.error(`[trial-drip] nudge failed for ${t.user.email}:`, err);
      }
    }

    // Day 6 urgency — send to everyone still on trial, regardless of engagement
    if (!sent && trial.dayOfTrial >= 6 && lastDripDay < 6) {
      try {
        await sendTrialUrgencyEmail(t.user.email, t.user.fullName);
        urgencySent++;
        sent = true;
        await prisma.levelTrial.update({ where: { id: t.id }, data: { lastDripDay: 6 } });
      } catch (err) {
        console.error(`[trial-drip] urgency failed for ${t.user.email}:`, err);
      }
    }

    if (sent) {
      emailedUserIds.add(t.user.id);
    } else {
      skipped++;
    }
  }

  console.log(`[trial-drip] done — nudge:${nudgeSent} urgency:${urgencySent} skipped:${skipped}`);
  return NextResponse.json({ ok: true, nudgeSent, urgencySent, skipped });
}
