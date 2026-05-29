import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { startQuizAttempt } from '@/server/services/quiz.service';
import { quizSelectionSchema } from '@/server/validators/quiz';

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
    const attempt = await startQuizAttempt(user.id, selection);

    return NextResponse.json({ success: true, data: attempt }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to start quiz' } }, { status: 500 });
  }
}
