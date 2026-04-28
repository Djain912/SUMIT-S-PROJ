import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | null;

    const chapters = await prisma.chapter.findMany({
      where: {
        isPublished: true,
        isDeleted: false,
        level: level ?? undefined,
      },
      orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        level: true,
        title: true,
        slug: true,
        description: true,
        orderIndex: true,
      },
    });

    return NextResponse.json({ success: true, data: chapters }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load chapters' } }, { status: 500 });
  }
}
