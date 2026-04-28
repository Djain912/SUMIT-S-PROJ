import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { createQuestion } from '@/server/services/question.service';
import { questionSchema } from '@/server/validators/admin-content';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | null;
    const chapterId = searchParams.get('chapterId') ?? undefined;
    const subtopicId = searchParams.get('subtopicId') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = { isPublished: true, isDeleted: false };
    if (level) where.level = level;
    if (chapterId) where.chapterId = chapterId;
    if (subtopicId) where.subtopicId = subtopicId;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { select: { id: true, contentJson: true, isCorrect: true, orderIndex: true } },
        },
        take: limit,
        skip,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load questions' } }, { status: 500 });
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
      key: 'admin:questions:post',
      maxRequests: 120,
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

    const payload = await request.json();
    const input = questionSchema.parse(payload);
    const question = await createQuestion(input, user.id);

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to create question' } }, { status: 500 });
  }
}
