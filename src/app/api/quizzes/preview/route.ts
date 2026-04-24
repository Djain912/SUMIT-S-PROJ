import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { resolveQuizQuestions } from '@/server/services/quiz.service';
import { quizSelectionSchema } from '@/server/validators/quiz';

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
    const payload = await request.json();
    const selection = quizSelectionSchema.parse(payload);
    const questions = await resolveQuizQuestions(selection);

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to preview quiz' } }, { status: 500 });
  }
}
