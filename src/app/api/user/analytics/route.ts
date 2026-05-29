import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserAnalyticsData } from '@/server/services/analytics.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const data = await getUserAnalyticsData(user.id);

    return NextResponse.json({ success: true, data }, {
      headers: {
        // Private (per-user) cache: browser caches for 2 min, serves stale for 5 min while revalidating
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Unable to load analytics';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
