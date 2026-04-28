import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { deleteSubtopic, updateSubtopic } from '@/server/services/subtopic.service';
import { subtopicInputSchema } from '@/server/validators/content';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAdminUser();
    const decision = await enforceRateLimit({
      request,
      key: 'admin:subtopics:patch',
      maxRequests: 120,
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

    const { id } = await context.params;
    const payload = await request.json();
    const input = subtopicInputSchema.parse(payload);
    const subtopic = await updateSubtopic(id, input);
    revalidatePath('/admin/subtopics');

    return NextResponse.json({ success: true, data: subtopic });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to update subtopic' } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!validateCsrfOrigin(_request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAdminUser();
    const decision = await enforceRateLimit({
      request: _request,
      key: 'admin:subtopics:delete',
      maxRequests: 40,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many subtopic deletions' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { id } = await context.params;
    await deleteSubtopic(id);
    revalidatePath('/admin/subtopics');
    redirect('/admin/subtopics?nocache=' + Date.now());

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to delete subtopic' } }, { status: 500 });
  }
}
