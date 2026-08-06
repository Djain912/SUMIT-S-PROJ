import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { getCumulativeFlow, getSectorSnapshot } from '@/lib/reports/fii-dii-data';
import { renderReportPng } from '@/lib/reports/render';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/admin/reports/fii-dii?period=weekly|monthly
// Manual preview/download for the admin - same renderer the cron job uses,
// so what you see here is exactly what gets emailed on schedule.
export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') === 'monthly' ? 'monthly' : 'weekly';
    const days = period === 'monthly' ? 30 : 7;

    const cumulative = await getCumulativeFlow(days);
    if (!cumulative) {
      return NextResponse.json(
        { success: false, error: { message: 'No FII/DII cash-flow data found for this period yet.' } },
        { status: 404 },
      );
    }
    const sector = await getSectorSnapshot();

    const bytes = await renderReportPng({ kind: period, cumulative, sector });
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="chartix-fii-dii-${period}.png"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
