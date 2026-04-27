import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'REVIEWED' | 'DISMISSED' | null;
    const questionId = searchParams.get('questionId') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (questionId) where.questionId = questionId;

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.questionReport.findMany({
        where,
        select: {
          id: true,
          questionId: true,
          userId: true,
          reason: true,
          status: true,
          createdAt: true,
          question: {
            select: {
              id: true,
              promptJson: true,
              difficulty: true,
              level: true,
              chapter: {
                select: {
                  id: true,
                  title: true,
                },
              },
              subtopic: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.questionReport.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error('Error fetching question reports:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch reports' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdminUser();
    
    const decision = enforceRateLimit({
      request,
      key: 'admin:reports:patch',
      maxRequests: 120,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many report updates' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const { reportId, status } = payload;

    if (!reportId || !status) {
      return NextResponse.json(
        { success: false, error: { message: 'Report ID and status are required' } },
        { status: 400 }
      );
    }

    if (!['PENDING', 'REVIEWED', 'DISMISSED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid status' } },
        { status: 400 }
      );
    }

    // Update report status
    const report = await prisma.questionReport.update({
      where: { id: reportId },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
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

    console.error('Error updating report status:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update report' } },
      { status: 500 }
    );
  }
}
