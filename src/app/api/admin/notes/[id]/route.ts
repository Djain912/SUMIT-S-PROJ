import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { deleteNote, updateNote } from '@/server/services/note.service';
import { noteUpdateSchema } from '@/server/validators/admin-content';
import { prisma } from '@/lib/db/prisma';
import { embedNote, deleteChunksBySourceId } from '@/lib/ai/rag';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAdminUser();
    const decision = await enforceRateLimit({
      request,
      key: 'admin:notes:patch',
      maxRequests: 120,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many note updates' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { id } = await context.params;
    const payload = await request.json();
    const input = noteUpdateSchema.parse(payload);
    const note = await updateNote(id, input, user.id);
    revalidatePath('/admin/notes');

    // Keep vector store in sync with note content
    if (note.isPublished && note.contentHtml) {
      // Published with content — embed (replaces old chunks automatically)
      try {
        const fullNote = await prisma.note.findUnique({
          where: { id: note.id },
          select: {
            id: true, title: true, contentHtml: true,
            subtopic: { select: { title: true, chapter: { select: { title: true, level: true } } } },
          },
        });
        if (fullNote) {
          embedNote({
            id: fullNote.id,
            title: fullNote.title,
            contentHtml: fullNote.contentHtml,
            level: fullNote.subtopic.chapter.level,
            chapterTitle: fullNote.subtopic.chapter.title,
            subtopicTitle: fullNote.subtopic.title,
          }).catch((e) => console.error('[auto-embed update]', e));
        }
      } catch (e) {
        console.error('[auto-embed update lookup]', e);
      }
    } else {
      // Unpublished or content cleared — remove from vector store
      deleteChunksBySourceId(id).catch((e) => console.error('[auto-embed delete chunks]', e));
    }

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to update note' } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!validateCsrfOrigin(_request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAdminUser();
    const decision = await enforceRateLimit({
      request: _request,
      key: 'admin:notes:delete',
      maxRequests: 40,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many note deletions' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const { id } = await context.params;
    await deleteNote(id);
    // Remove from vector store so AI no longer references deleted note
    deleteChunksBySourceId(id).catch((e) => console.error('[auto-embed delete note]', e));
    revalidatePath('/admin/notes');
    redirect('/admin/notes?nocache=' + Date.now());

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to delete note' } }, { status: 500 });
  }
}
