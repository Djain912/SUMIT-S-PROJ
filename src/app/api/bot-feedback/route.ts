import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Light rate limit: 60 feedback per IP per hour
    const rl = await enforceRateLimit({
      request,
      key: 'bot-feedback',
      maxRequests: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    const body = await request.json();
    const botType = body.botType as string | undefined;
    const question = (body.question as string | undefined)?.trim();
    const answer = (body.answer as string | undefined)?.trim();
    const rating = body.rating as string | undefined;
    const userNote = (body.userNote as string | undefined)?.trim() ?? null;

    if (!botType || !question || !answer || !['like', 'dislike'].includes(rating ?? '')) {
      return NextResponse.json({ success: false, error: { message: 'Invalid payload' } }, { status: 400 });
    }

    await prisma.botFeedback.create({
      data: {
        botType,
        question: question.slice(0, 1000),
        answer: answer.slice(0, 5000),
        rating: rating!,
        userNote: userNote ? userNote.slice(0, 1000) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[bot-feedback] error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
