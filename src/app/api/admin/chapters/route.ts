import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where: {
          ...(level ? { level } : {}),
          isDeleted: false,
        },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          level: true,
          title: true,
          slug: true,
          description: true,
          orderIndex: true,
          isPublished: true,
          subtopics: {
            where: { isDeleted: false },
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              chapterId: true,
              title: true,
              slug: true,
            },
          },
        },
        take: limit,
        skip,
      }),
      prisma.chapter.count({
        where: {
          ...(level ? { level } : {}),
          isDeleted: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: chapters,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to load chapters' } }, { status: 500 });
  }
}