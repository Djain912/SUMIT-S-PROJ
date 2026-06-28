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
    let chapterId = searchParams.get('chapterId') ?? searchParams.get('chapter');
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

    // Resolve access once — used both for the default-chapter fallback below
    // and the chapter-level gate further down.
    const access = await getChapterAccess(user.email);

    // No selection (e.g. a fresh visit to /user/notes from the dashboard or a
    // welcome email) → default to the first chapter the user can access so the
    // page loads notes instead of erroring with "chapterId required".
    if (!subtopicId && !chapterId) {
      const firstNote = await prisma.note.findFirst({
        where: {
          isPublished: true,
          isDeleted: false,
          subtopic: {
            chapter: {
              level: 'LEVEL_1',
              isPublished: true,
              isDeleted: false,
              ...(access.full ? {} : { id: { in: [...access.chapterIds] } }),
            },
          },
        },
        orderBy: [
          { subtopic: { chapter: { orderIndex: 'asc' } } },
          { subtopic: { orderIndex: 'asc' } },
          { orderIndex: 'asc' },
        ],
        select: { subtopic: { select: { chapterId: true } } },
      });
      if (!firstNote) {
        return NextResponse.json({ success: true, data: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
      }
      chapterId = firstNote.subtopic.chapterId;
    }
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
      // Group by the parent subtopic's curriculum order FIRST (so 4.1 notes,
      // then 4.2, 4.3 …), then by each note's own order/title within a subtopic.
      // Without the subtopic sort, notes from different subtopics interleave.
      orderBy: [
        { subtopic: { orderIndex: 'asc' } },
        { orderIndex: 'asc' },
        { title: 'asc' },
      ],
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