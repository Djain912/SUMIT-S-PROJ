import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getChapterAccess } from '@/server/policies/access';

export const dynamic = 'force-dynamic';
// Per-user access filtering — must not be shared-cached across users.
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
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
        description: true,
        orderIndex: true,
      },
    });

    // Scoped (coupon) users only see chapters they hold a live entitlement for.
    const access = await getChapterAccess(user.email);
    const data = access.full ? chapters : chapters.filter((c) => access.chapterIds.has(c.id));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to load chapters' } }, { status: 500 });
  }
}
