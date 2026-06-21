import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { startQuizAttempt } from '@/server/services/quiz.service';
import { quizSelectionSchema } from '@/server/validators/quiz';
import { getChapterAccess, getTrialState } from '@/server/policies/access';
import { prisma } from '@/lib/db/prisma';
import { TRIAL_MAX_MOCKS } from '@/lib/trial';

export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAuthenticatedUser();
    const decision = await enforceRateLimit({
      request,
      key: 'quiz:start:post',
      maxRequests: 30,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many quiz start requests' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const selection = quizSelectionSchema.parse(payload);

    // Trial users may take only a limited number of full-length mock tests.
    // Paid/admin users are unlimited; scoped-coupon users are unaffected.
    if (selection.mode === 'FULL_TEST') {
      const trial = await getTrialState(user.email);
      if (trial && !trial.hasFullAccess && trial.inTrial) {
        const taken = await prisma.quizAttempt.count({ where: { userId: user.id, mode: 'FULL_TEST' } });
        if (taken >= TRIAL_MAX_MOCKS) {
          return NextResponse.json(
            {
              success: false,
              limit: true,
              error: { message: `Your free trial includes ${TRIAL_MAX_MOCKS} full-length mock tests. Upgrade for unlimited mock exams and detailed analytics.` },
            },
            { status: 403 },
          );
        }
      }
    }

    const access = await getChapterAccess(user.email);
    const attempt = await startQuizAttempt(user.id, selection, access.full ? 'ALL' : [...access.chapterIds]);

    return NextResponse.json({ success: true, data: attempt }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to start quiz' } }, { status: 500 });
  }
}
