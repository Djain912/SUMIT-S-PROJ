import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { embedNote } from '@/lib/ai/rag';
import { countChunks } from '@/lib/ai/knowledge-store';

export const dynamic = 'force-dynamic';

// GET /api/admin/knowledge — stats on the knowledge base
export async function GET() {
  try {
    await requireAdminUser();
    const totalChunks = await countChunks();
    return NextResponse.json({ success: true, data: { totalChunks } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
  }
}

// POST /api/admin/knowledge — sync all published notes into the vector store
export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json().catch(() => ({}));
    const level: string | undefined = body.level;

    // Fetch all published, non-deleted notes with their chapter/subtopic context
    const notes = await prisma.note.findMany({
      where: {
        isPublished: true,
        isDeleted: false,
        contentHtml: { not: null },
        ...(level
          ? {
              subtopic: {
                chapter: { level: level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' },
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        contentHtml: true,
        subtopic: {
          select: {
            title: true,
            chapter: {
              select: {
                title: true,
                level: true,
              },
            },
          },
        },
      },
    });

    let totalChunks = 0;
    const errors: string[] = [];

    for (const note of notes) {
      try {
        const count = await embedNote({
          id: note.id,
          title: note.title,
          contentHtml: note.contentHtml,
          level: note.subtopic.chapter.level,
          chapterTitle: note.subtopic.chapter.title,
          subtopicTitle: note.subtopic.title,
        });
        totalChunks += count;
      } catch (err) {
        errors.push(`Note "${note.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        notesProcessed: notes.length,
        chunksCreated: totalChunks,
        errors,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    console.error('[admin/knowledge] sync error:', error);
    return NextResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
  }
}
