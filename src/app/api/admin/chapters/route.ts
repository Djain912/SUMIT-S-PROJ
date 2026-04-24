import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | null;

    const chapters = await prisma.chapter.findMany({
      where: level ? { level } : undefined,
      orderBy: { orderIndex: 'asc' },
      include: {
        subtopics: {
          orderBy: { orderIndex: 'asc' },
          where: { isPublished: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: chapters });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to load chapters' } }, { status: 500 });
  }
}