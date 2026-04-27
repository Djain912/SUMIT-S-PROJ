import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id: noteId } = await params;
    
    const body = await request.json();
    const reason = body.reason?.trim();
    
    if (!reason) {
      return NextResponse.json({ success: false, error: { message: 'Reason is required' } }, { status: 400 });
    }
    
    if (reason.length > 1000) {
      return NextResponse.json({ success: false, error: { message: 'Reason must be less than 1000 characters' } }, { status: 400 });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId, isDeleted: false },
    });
    
    if (!note) {
      return NextResponse.json({ success: false, error: { message: 'Note not found' } }, { status: 404 });
    }

    const existingReport = await prisma.noteReport.findUnique({
      where: { noteId_userId: { noteId, userId: user.id } },
    });
    
    if (existingReport) {
      return NextResponse.json({ success: false, error: { message: 'You have already reported this note' } }, { status: 400 });
    }

    await prisma.noteReport.create({
      data: {
        noteId,
        userId: user.id,
        reason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Note report API error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Unable to report note';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}