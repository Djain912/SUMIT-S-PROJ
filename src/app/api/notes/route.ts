import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
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
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    console.error('Notes API error:', error);
    return NextResponse.json({ success: false, error: { message: 'Unable to load notes' } }, { status: 500 });
  }
}