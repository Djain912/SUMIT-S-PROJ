import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserDashboardData } from '@/server/services/dashboard.service';

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level') ?? 'LEVEL_1';
    
    if (!['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(levelParam)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid level' } }, { status: 400 });
    }
    
    const level = levelParam as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

    const data = await getUserDashboardData(user.id, level);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard API error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Unable to load dashboard';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}