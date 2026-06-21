import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { getTrialState } from '@/server/policies/access';

export const dynamic = 'force-dynamic';

// Lightweight status feed for the trial UI (banner refresh + conversion
// prompts). Mock/MCQ counts are derived from quiz data — no extra writes.
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const trial = await getTrialState(user.email);

    if (!trial || trial.hasFullAccess) {
      return NextResponse.json({ success: true, data: { showPrompts: false } });
    }

    const [mockAttempted, mcqAttempted] = await Promise.all([
      prisma.quizAttempt.count({ where: { userId: user.id, mode: 'FULL_TEST' } }),
      prisma.quizAttemptItem.count({ where: { attempt: { userId: user.id } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        showPrompts: true,
        inTrial: trial.inTrial,
        expired: trial.expired,
        dayOfTrial: trial.dayOfTrial,
        daysRemaining: trial.daysRemaining,
        mockAttempted,
        mcqAttempted,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to load status' } }, { status: 500 });
  }
}
