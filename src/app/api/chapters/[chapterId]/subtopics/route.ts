import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(_request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    await requireAuthenticatedUser();
    const { chapterId } = await context.params;

    const subtopics = await prisma.subtopic.findMany({
      where: {
        chapterId,
        isPublished: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        chapterId: true,
        title: true,
        description: true,
        orderIndex: true,
      },
    });

    return NextResponse.json({ success: true, data: subtopics }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load subtopics' } }, { status: 500 });
  }
}
