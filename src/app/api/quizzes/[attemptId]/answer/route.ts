import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { recordQuizAnswer } from '@/server/services/quiz.service';
import { quizAnswerSchema } from '@/server/validators/quiz';

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const decision = enforceRateLimit({
      request,
      key: 'quiz:answer:post',
      maxRequests: 180,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many answer submissions' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { attemptId } = await context.params;
    const payload = await request.json();
    const input = quizAnswerSchema.parse({ ...payload, attemptId });
    const item = await recordQuizAnswer(user.id, input);

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to record answer' } }, { status: 500 });
  }
}
