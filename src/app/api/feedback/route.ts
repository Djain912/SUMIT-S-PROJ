import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthenticatedUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';

const LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'GENERAL'];
const ANSWERS = ['YES', 'NO', 'NO_COMMENT', 'NOT_APPLICABLE'];

// POST /api/feedback — authenticated candidates submit structured course feedback
// (CMT Prep Provider guideline #5: feedback results must be available on request).
export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const level = String(body.level ?? '');
  const rating = Number(body.rating);
  const consistent = String(body.consistent ?? '');
  const informed = String(body.informed ?? '');
  const adequateTime = String(body.adequateTime ?? '');
  const comments = String(body.comments ?? '').trim().slice(0, 2000);

  if (
    !LEVELS.includes(level) ||
    !Number.isInteger(rating) || rating < 1 || rating > 5 ||
    !ANSWERS.includes(consistent) ||
    !ANSWERS.includes(informed) ||
    !ANSWERS.includes(adequateTime)
  ) {
    return NextResponse.json({ error: 'Please answer all required questions.' }, { status: 400 });
  }

  try {
    await prisma.candidateFeedback.create({
      data: {
        userId: user.id ?? null,
        email: user.email,
        level,
        rating,
        consistent,
        informed,
        adequateTime,
        comments,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[feedback POST]', err);
    return NextResponse.json({ error: 'Failed to save feedback. Please try again.' }, { status: 500 });
  }
}
