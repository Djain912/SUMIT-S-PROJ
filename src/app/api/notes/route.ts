import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getChapterAccess } from '@/server/policies/access';

export const dynamic = 'force-dynamic';
// Per-user access gating — must not be shared-cached across users.
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    let subtopicId = searchParams.get('subtopicId') ?? searchParams.get('subtopic');
    const chapterId = searchParams.get('chapterId') ?? searchParams.get('chapter');
    const noteId = searchParams.get('note');

    // When a specific note ID is given, resolve its subtopicId first
    if (noteId && !subtopicId && !chapterId) {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { subtopicId: true, isPublished: true, isDeleted: true },
      });
      if (!note || note.isDeleted || !note.isPublished) {
        return NextResponse.json({ success: true, data: [], _openNoteId: noteId });
      }
      subtopicId = note.subtopicId;
    }

    if (!subtopicId && !chapterId) {
      return NextResponse.json({ success: false, error: { message: 'subtopicId or chapterId required' } }, { status: 400 });
    }

    // Chapter-level access gate: resolve which chapter these notes belong to,
    // then deny if a scoped (coupon) user doesn't hold that chapter.
    const access = await getChapterAccess(user.email);
    if (!access.full) {
      let effectiveChapterId = chapterId;
      if (!effectiveChapterId && subtopicId) {
        const sub = await prisma.subtopic.findUnique({ where: { id: subtopicId }, select: { chapterId: true } });
        effectiveChapterId = sub?.chapterId ?? null;
      }
      if (!effectiveChapterId || !access.chapterIds.has(effectiveChapterId)) {
        return NextResponse.json({ success: true, data: [], locked: true, _openNoteId: noteId ?? null },
          { headers: { 'Cache-Control': 'private, no-store' } });
      }
    }

    const where: { isPublished: true; isDeleted: false; subtopicId?: string; subtopic?: { chapterId: string } } = {
      isPublished: true,
      isDeleted: false,
    };

    if (subtopicId) {
      where.subtopicId = subtopicId;
    } else if (chapterId) {
      where.subtopic = { chapterId };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        subtopicId: true,
        title: true,
        contentHtml: true,
        watermarkConfig: true,
        orderIndex: true,
        isPublished: true,
      },
    });

    return NextResponse.json({ success: true, data: notes, _openNoteId: noteId ?? null }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    console.error('Notes API error:', error);
    return NextResponse.json({ success: false, error: { message: 'Unable to load notes' } }, { status: 500 });
  }
}