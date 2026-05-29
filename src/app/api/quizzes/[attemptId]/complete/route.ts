import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { completeQuizAttempt } from '@/server/services/quiz.service';

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
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
      key: 'quiz:complete:post',
      maxRequests: 30,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many completion requests' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { attemptId } = await context.params;
    const attempt = await completeQuizAttempt(user.id, attemptId);

    return NextResponse.json({ success: true, data: attempt });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to complete quiz' } }, { status: 500 });
  }
}
