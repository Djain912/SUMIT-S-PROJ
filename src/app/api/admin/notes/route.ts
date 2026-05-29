import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { createNote } from '@/server/services/note.service';
import { noteSchema } from '@/server/validators/admin-content';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const subtopicId = searchParams.get('subtopicId');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    if (!subtopicId) {
      return NextResponse.json({ success: false, error: { message: 'subtopicId is required' } }, { status: 400 });
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: {
          subtopicId,
          isDeleted: false,
        },
        orderBy: { orderIndex: 'asc' },
        take: limit,
        skip,
      }),
      prisma.note.count({
        where: {
          subtopicId,
          isDeleted: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load notes' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    revalidatePath('/admin/notes');

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to create note' } }, { status: 500 });
  }
}
