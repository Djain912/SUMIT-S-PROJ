import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

function requireAdmin() {
  return auth().then((session) => {
    const user = session?.user as { role?: string } | undefined;
    if (!user || user.role !== 'ADMIN') return null;
    return session;
  });
}

// GET /api/admin/feedback — list candidate feedback (admin only).
// ?format=csv downloads a CSV, ready to supply to the CMT Association on request.
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await prisma.candidateFeedback.findMany({ orderBy: { createdAt: 'desc' } });

    if (req.nextUrl.searchParams.get('format') === 'csv') {
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const header = 'Date,Email,Level,Rating (1-5),Consistent with current curriculum,Kept informed of updates/errata,Available in adequate time,Comments';
      const lines = rows.map((r) =>
        [
          r.createdAt.toISOString().slice(0, 10),
          esc(r.email),
          r.level,
          String(r.rating),
          r.consistent,
          r.informed,
          r.adequateTime,
          esc(r.comments),
        ].join(','),
      );
      return new NextResponse([header, ...lines].join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="chartix-candidate-feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ feedback: rows, total: rows.length });
  } catch (err) {
    console.error('[admin feedback GET]', err);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
