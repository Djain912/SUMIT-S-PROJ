import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { upsertImageCaption } from '@/lib/ai/image-captions';

export const dynamic = 'force-dynamic';

// POST /api/admin/image-captions  { url, caption }
// Saves an admin-defined caption for a note image so the chatbot can identify it.
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const url: string = typeof body.url === 'string' ? body.url.trim() : '';
    const caption: string = typeof body.caption === 'string' ? body.caption : '';

    if (!url) {
      return NextResponse.json(
        { success: false, error: { message: 'Image url is required' } },
        { status: 400 },
      );
    }

    await upsertImageCaption(url, caption);
    return NextResponse.json({ success: true, data: { url, caption: caption.trim() } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode },
      );
    }
    console.error('[admin/image-captions] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Server error' } },
      { status: 500 },
    );
  }
}
