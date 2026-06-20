import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET — all bookmarks for the signed-in user on this chapter
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  try {
    const { chapterId } = await params;
    const user = await requireAuthenticatedUser();

    const bookmarks = await prisma.summaryBookmark.findMany({
      where: { userId: user.id, chapterId },
      select: { itemType: true, itemIndex: true },
    });

    return NextResponse.json({ success: true, data: bookmarks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load bookmarks' } }, { status: 500 });
  }
}

// POST — toggle a bookmark (create if missing, delete if exists)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid origin' } }, { status: 403 });
    }
    const { chapterId } = await params;
    const user = await requireAuthenticatedUser();

    const body = await request.json() as { itemType: string; itemIndex: number };
    const { itemType, itemIndex } = body;

    if (!itemType || itemIndex == null) {
      return NextResponse.json({ success: false, error: { message: 'itemType and itemIndex required' } }, { status: 400 });
    }

    const where = { userId_chapterId_itemType_itemIndex: { userId: user.id, chapterId, itemType, itemIndex } };
    const existing = await prisma.summaryBookmark.findUnique({ where });

    if (existing) {
      await prisma.summaryBookmark.delete({ where });
      return NextResponse.json({ success: true, data: { bookmarked: false } });
    }

    await prisma.summaryBookmark.create({
      data: { userId: user.id, chapterId, itemType, itemIndex },
    });
    return NextResponse.json({ success: true, data: { bookmarked: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to toggle bookmark' } }, { status: 500 });
  }
}
