import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { deleteNote, updateNote } from '@/server/services/note.service';
import { noteSchema } from '@/server/validators/admin-content';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser();
    const decision = enforceRateLimit({
      request,
      key: 'admin:notes:patch',
      maxRequests: 120,
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

    const { id } = await context.params;
    const payload = await request.json();
    const input = noteSchema.parse(payload);
    const note = await updateNote(id, input, user.id);

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to update note' } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser();
    const decision = enforceRateLimit({
      request: _request,
      key: 'admin:notes:delete',
      maxRequests: 40,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many note deletions' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { id } = await context.params;
    await deleteNote(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to delete note' } }, { status: 500 });
  }
}
