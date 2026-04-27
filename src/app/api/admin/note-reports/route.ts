import { NextResponse } from 'next/server';
import { Prisma, QuestionReportStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAdminUser } from '@/server/policies/auth';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || '';
    const noteId = searchParams.get('noteId') || '';

    const where: Prisma.NoteReportWhereInput = {};
    
    if (status) {
      where.status = status as QuestionReportStatus;
    }
    if (noteId) {
      where.noteId = noteId;
    }

    const [reports, total] = await Promise.all([
      prisma.noteReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          note: {
            select: {
              id: true,
              title: true,
              subtopic: {
                select: {
                  id: true,
                  title: true,
                  chapter: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
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
      }),
      prisma.noteReport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Note reports API error:', error);
    const message = error instanceof Error ? error.message : 'Unable to load note reports';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const { reportId, status } = body;

    if (!reportId || !status) {
      return NextResponse.json({ success: false, error: { message: 'Missing reportId or status' } }, { status: 400 });
    }

    const updated = await prisma.noteReport.update({
      where: { id: reportId },
      data: { status: status as QuestionReportStatus },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Note reports API error:', error);
    const message = error instanceof Error ? error.message : 'Unable to update note report';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}