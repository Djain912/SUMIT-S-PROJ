import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { createNote, listNotes } from '@/server/services/note.service';
import { noteSchema } from '@/server/validators/admin-content';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const subtopicId = searchParams.get('subtopicId');

    if (!subtopicId) {
      return NextResponse.json({ success: false, error: { message: 'subtopicId is required' } }, { status: 400 });
    }

    const notes = await listNotes(subtopicId);
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load notes' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const decision = enforceRateLimit({
      request,
      key: 'admin:notes:post',
      maxRequests: 80,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many note updates' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const input = noteSchema.parse(payload);
    const note = await createNote(input, user.id);

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to create note' } }, { status: 500 });
  }
}
