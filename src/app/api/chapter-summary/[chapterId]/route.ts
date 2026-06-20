import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { normalizeSummary, type ChapterSummaryContent } from '@/lib/chapter-summary/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET — fetch a chapter's revision sheet (signed-in users; layout already gates access)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  try {
    const { chapterId } = await params;
    await requireAuthenticatedUser();

    const row = await prisma.chapterSummary.findUnique({ where: { chapterId } });
    if (!row) return NextResponse.json({ success: true, data: null });

    return NextResponse.json({
      success: true,
      data: { chapterId, isPublished: row.isPublished, ...normalizeSummary(row) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load summary' } }, { status: 500 });
  }
}

// PUT — create or update a chapter's revision sheet (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ chapterId: string }> },
) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid origin' } }, { status: 403 });
    }
    await requireAdminUser();
    const { chapterId } = await params;

    const body = await request.json() as Partial<ChapterSummaryContent> & { isPublished?: boolean };
    const content = normalizeSummary(body);
    const data = {
      summary: content.summary,
      keyConcepts: content.keyConcepts,
      formulas: content.formulas,
      examTips: content.examTips,
      highYield: content.highYield,
      oneMinute: content.oneMinute,
      isPublished: body.isPublished ?? false,
    };

    const row = await prisma.chapterSummary.upsert({
      where: { chapterId },
      update: data,
      create: { chapterId, ...data },
    });

    return NextResponse.json({
      success: true,
      data: { chapterId, isPublished: row.isPublished, ...normalizeSummary(row) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Admin only' } }, { status: 401 });
    }
    console.error('[chapter-summary PUT]', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to save summary' } }, { status: 500 });
  }
}
