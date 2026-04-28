import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { deleteQuestion, updateQuestion } from '@/server/services/question.service';
import { questionSchema } from '@/server/validators/admin-content';

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
      key: 'admin:questions:patch',
      maxRequests: 180,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many question updates' } },
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
    const input = questionSchema.parse(payload);
    const question = await updateQuestion(id, input, user.id);
    revalidatePath('/admin/questions');

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to update question' } }, { status: 500 });
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
      key: 'admin:questions:delete',
      maxRequests: 60,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many question deletions' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { id } = await context.params;
    await deleteQuestion(id);
    revalidatePath('/admin/questions');
    redirect('/admin/questions?nocache=' + Date.now());

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to delete question' } }, { status: 500 });
  }
}
