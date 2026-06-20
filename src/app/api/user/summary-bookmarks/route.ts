import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { normalizeSummary, type SummaryItemType } from '@/lib/chapter-summary/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET — every bookmark the signed-in user has, resolved to its actual content
// and grouped by chapter. Powers the global "My Bookmarks" revision view.

type ResolvedItem = {
  itemType: SummaryItemType;
  itemIndex: number;
  // exactly one of these is populated depending on itemType
  text?: string;
  concept?: { name: string; definition: string; whyItMatters: string; examAngle: string };
  formula?: { label: string; expression: string; notes: string };
  tip?: { remember: string; mistake: string };
};

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const bookmarks = await prisma.summaryBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { chapterId: true, itemType: true, itemIndex: true },
    });

    if (!bookmarks.length) return NextResponse.json({ success: true, data: [] });

    const chapterIds = [...new Set(bookmarks.map(b => b.chapterId))];

    // Only published summaries + chapter titles.
    const [summaries, chapters] = await Promise.all([
      prisma.chapterSummary.findMany({ where: { chapterId: { in: chapterIds }, isPublished: true } }),
      prisma.chapter.findMany({ where: { id: { in: chapterIds } }, select: { id: true, title: true, orderIndex: true } }),
    ]);

    const summaryByChapter = new Map(summaries.map(s => [s.chapterId, normalizeSummary(s)]));
    const titleByChapter = new Map(chapters.map(c => [c.id, { title: c.title, orderIndex: c.orderIndex }]));

    const groups = new Map<string, ResolvedItem[]>();

    for (const b of bookmarks) {
      const content = summaryByChapter.get(b.chapterId);
      if (!content) continue; // chapter unpublished or removed — skip stale bookmark
      const type = b.itemType as SummaryItemType;
      const i = b.itemIndex;
      let resolved: ResolvedItem | null = null;

      if (type === 'summary' && content.summary[i] != null) resolved = { itemType: type, itemIndex: i, text: content.summary[i] };
      else if (type === 'highYield' && content.highYield[i] != null) resolved = { itemType: type, itemIndex: i, text: content.highYield[i] };
      else if (type === 'oneMinute' && content.oneMinute[i] != null) resolved = { itemType: type, itemIndex: i, text: content.oneMinute[i] };
      else if (type === 'keyConcept' && content.keyConcepts[i] != null) resolved = { itemType: type, itemIndex: i, concept: content.keyConcepts[i] };
      else if (type === 'formula' && content.formulas[i] != null) resolved = { itemType: type, itemIndex: i, formula: content.formulas[i] };
      else if (type === 'examTip' && content.examTips[i] != null) resolved = { itemType: type, itemIndex: i, tip: content.examTips[i] };

      if (!resolved) continue; // item index no longer exists (content edited) — skip
      if (!groups.has(b.chapterId)) groups.set(b.chapterId, []);
      groups.get(b.chapterId)!.push(resolved);
    }

    const data = [...groups.entries()]
      .map(([chapterId, items]) => ({
        chapterId,
        chapterTitle: titleByChapter.get(chapterId)?.title ?? 'Chapter',
        orderIndex: titleByChapter.get(chapterId)?.orderIndex ?? 0,
        items,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load bookmarks' } }, { status: 500 });
  }
}
