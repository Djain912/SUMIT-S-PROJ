'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { cmtLevelSchema } from '@/server/validators/quiz';
import { TRIAL_DAYS } from '@/lib/trial';
import { sendTrialWelcomeEmail } from '@/lib/email/welcome';

// Starts a user's one-time 7-day trial for a single CMT level. The DB's
// unique constraint on (userId, level) is the real source of truth for
// "already used" — this is safe against double-submits, back-button
// replays, and concurrent tabs, not just a pre-check. On failure, redirects
// back to /start-trial with an ?error= message (a <form action> must return
// void, so errors can't be returned directly the way a plain function could).
export async function startLevelTrial(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  const parsed = cmtLevelSchema.safeParse(formData.get('level'));
  if (!parsed.success) {
    redirect('/start-trial?error=' + encodeURIComponent('Please choose a level.'));
  }
  const level = parsed.data;

  const chapterCount = await prisma.chapter.count({
    where: { level, isPublished: true, isDeleted: false },
  });
  if (chapterCount === 0) {
    redirect('/start-trial?error=' + encodeURIComponent('This level is not available yet.'));
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  try {
    await prisma.levelTrial.create({
      data: { userId: user.id, level, startedAt: now, expiresAt },
    });
  } catch (err) {
    // Prisma unique-constraint violation (P2002) → this level's trial was
    // already used, by this exact request or an earlier one.
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      redirect('/start-trial?error=' + encodeURIComponent("You've already used your free trial for this level."));
    }
    throw err;
  }

  sendTrialWelcomeEmail(user.email, user.fullName, level).catch((e) =>
    console.error('[start-trial] welcome email failed:', e),
  );

  revalidatePath('/user');
  redirect(`/user/notes?welcome=1&level=${level}`);
}
