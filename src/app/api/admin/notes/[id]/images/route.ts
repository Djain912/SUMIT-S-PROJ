import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { parseStoredImage } from '@/lib/ai/rag';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/notes/[id]/images
// Returns the images (url + caption) currently indexed for the chatbot for this
// note. These are exactly what the AI tutor can show, with the caption it uses
// to decide which one matches a question.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const rows = await prisma.$queryRawUnsafe<{ entry: string }[]>(
      `SELECT DISTINCT unnest(image_urls) AS entry
       FROM knowledge_chunks
       WHERE source_id = $1`,
      id,
    );

    const seen = new Set<string>();
    const images: { url: string; caption: string }[] = [];
    for (const r of rows) {
      if (!r.entry) continue;
      const { url, caption } = parseStoredImage(r.entry);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      images.push({ url, caption });
    }

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
