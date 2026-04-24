import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subtopicId = searchParams.get('subtopicId') ?? searchParams.get('subtopic');
    const chapterId = searchParams.get('chapterId') ?? searchParams.get('chapter');

    if (!subtopicId && !chapterId) {
      return NextResponse.json({ success: false, error: { message: 'subtopicId or chapterId required' } }, { status: 400 });
    }

    let where: { isPublished: true; subtopicId?: string; subtopic?: { chapterId: string } } = {
      isPublished: true,
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
        contentJson: true,
        contentHtml: true,
        orderIndex: true,
        isPublished: true,
      },
    });

    return NextResponse.json({ success: true, data: notes }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json({ success: false, error: { message: 'Unable to load notes' } }, { status: 500 });
  }
}