import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    
    const decision = await enforceRateLimit({
      request,
      key: 'user:report:question',
      maxRequests: 30,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many reports. Please try again later.' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const { reason } = payload;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Reason is required' } },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { success: false, error: { message: 'Reason must be less than 500 characters' } },
        { status: 400 }
      );
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: { message: 'Question not found' } },
        { status: 404 }
      );
    }

    // Check if user already reported this question
    const existingReport = await prisma.questionReport.findUnique({
      where: {
        questionId_userId: {
          questionId: id,
          userId: user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: { message: 'You have already reported this question' } },
        { status: 400 }
      );
    }

    // Create report
    const report = await prisma.questionReport.create({
      data: {
        questionId: id,
        userId: user.id,
        reason: reason.trim(),
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error('Error reporting question:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to report question' } },
      { status: 500 }
    );
  }
}
