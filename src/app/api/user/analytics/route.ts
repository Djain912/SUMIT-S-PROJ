import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserAnalyticsData } from '@/server/services/analytics.service';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const data = await getUserAnalyticsData(user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Analytics API error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Unable to load analytics';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}