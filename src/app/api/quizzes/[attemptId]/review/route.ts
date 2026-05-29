import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getQuizAttemptReview } from '@/server/services/quiz.service';

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { attemptId } = await context.params;
    const attempt = await getQuizAttemptReview(user.id, attemptId);

    return NextResponse.json({ success: true, data: attempt });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load quiz review' } }, { status: 500 });
  }
}
