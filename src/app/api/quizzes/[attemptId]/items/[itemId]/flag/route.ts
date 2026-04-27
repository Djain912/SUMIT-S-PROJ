import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ attemptId: string; itemId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { attemptId, itemId } = await context.params;
    
    const decision = enforceRateLimit({
      request,
      key: 'user:flag:question',
      maxRequests: 500,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many requests. Please try again later.' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const { flagColor } = payload; // YELLOW, RED, or null to clear flag

    // Validate flagColor
    if (flagColor !== null && !['YELLOW', 'RED'].includes(flagColor)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid flag color' } },
        { status: 400 }
      );
    }

    // Verify the attempt belongs to this user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: { message: 'Quiz attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    // Verify the item belongs to this attempt
    const item = await prisma.quizAttemptItem.findUnique({
      where: { id: itemId },
      select: { attemptId: true },
    });

    if (!item || item.attemptId !== attemptId) {
      return NextResponse.json(
        { success: false, error: { message: 'Quiz item not found' } },
        { status: 404 }
      );
    }

    // Update the flag
    const updatedItem = await prisma.quizAttemptItem.update({
      where: { id: itemId },
      data: {
        flagColor,
        flaggedAt: flagColor ? new Date() : null,
      },
      select: {
        id: true,
        questionOrder: true,
        flagColor: true,
        flaggedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error('Error flagging quiz item:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to flag question' } },
      { status: 500 }
    );
  }
}
