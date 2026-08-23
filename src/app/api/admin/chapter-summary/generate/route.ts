import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { generateChapterSummary, SummaryGenerationError } from '@/lib/chapter-summary/generate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // AI generation can take a while

export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid origin' } }, { status: 403 });
    }
    await requireAdminUser();

    const { chapterId } = await request.json() as { chapterId?: string };
    if (!chapterId) {
      return NextResponse.json({ success: false, error: { message: 'chapterId required' } }, { status: 400 });
    }

    const data = await generateChapterSummary(chapterId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Admin only' } }, { status: 401 });
    }
    if (error instanceof SummaryGenerationError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.status });
    }
    console.error('[chapter-summary generate]', error);
    return NextResponse.json({ success: false, error: { message: 'Generation failed, please retry.' } }, { status: 500 });
  }
}
