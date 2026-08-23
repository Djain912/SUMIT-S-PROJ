import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';

// Marks a chapter as viewed for the onboarding checklist and trial-drip
// emails. Called once per note open from the client. Fail-soft: a tracking
// miss must never surface as an error to the reader.
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }

    const user = await requireAuthenticatedUser();
    const body = await request.json();
    const subtopicId = typeof body.subtopicId === 'string' ? body.subtopicId : null;
    if (!subtopicId) {
      return NextResponse.json({ success: false, error: { message: 'subtopicId is required' } }, { status: 400 });
    }

    const subtopic = await prisma.subtopic.findUnique({ where: { id: subtopicId }, select: { chapterId: true } });
    if (!subtopic) {
      return NextResponse.json({ success: true }); // nothing to track, but don't error the reader
    }

    const existing = await prisma.userActivity.findUnique({
      where: { userId: user.id },
      select: { chaptersViewed: true, firstChapterDoneAt: true },
    });
    const chaptersViewed = new Set((existing?.chaptersViewed as string[] | undefined) ?? []);
    const alreadyTracked = chaptersViewed.has(subtopic.chapterId);
    chaptersViewed.add(subtopic.chapterId);

    if (!alreadyTracked) {
      await prisma.userActivity.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          chaptersViewed: [...chaptersViewed],
          firstChapterDoneAt: existing?.firstChapterDoneAt ?? new Date(),
        },
        update: {
          chaptersViewed: [...chaptersViewed],
          firstChapterDoneAt: existing?.firstChapterDoneAt ?? new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    console.error('[note-view] tracking failed:', error);
    // Fail-soft — the reader should never see this as a broken page.
    return NextResponse.json({ success: true });
  }
}
