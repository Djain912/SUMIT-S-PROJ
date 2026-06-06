import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/notes/[id]/images
// Returns the distinct image URLs currently indexed for the chatbot for this note.
// These are the images the AI tutor can actually show in answers.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const rows = await prisma.$queryRawUnsafe<{ url: string }[]>(
      `SELECT DISTINCT unnest(image_urls) AS url
       FROM knowledge_chunks
       WHERE source_id = $1`,
      id,
    );

    const images = rows.map((r) => r.url).filter(Boolean);
    return NextResponse.json({ success: true, data: { images } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode },
      );
    }
    console.error('[admin/notes/images] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Server error' } },
      { status: 500 },
    );
  }
}
