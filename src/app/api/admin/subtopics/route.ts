import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { createSubtopic, listSubtopics } from '@/server/services/subtopic.service';
import { subtopicInputSchema } from '@/server/validators/content';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ success: false, error: { message: 'chapterId is required' } }, { status: 400 });
    }

    const subtopics = await listSubtopics(chapterId);
    return NextResponse.json({ success: true, data: subtopics });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load subtopics' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const decision = enforceRateLimit({
      request,
      key: 'admin:subtopics:post',
      maxRequests: 80,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many subtopic updates' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const input = subtopicInputSchema.parse(payload);
    const subtopic = await createSubtopic(input);

    return NextResponse.json({ success: true, data: subtopic }, { status: 201 });
  } catch (error) {
    console.error('Subtopic creation error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Unable to create subtopic';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
