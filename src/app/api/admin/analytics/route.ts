import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { fetchGA4Summary } from '@/lib/ga4';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminUser();
    const data = await fetchGA4Summary();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'unknown';
    if (msg === 'MISSING_CREDENTIALS') {
      return NextResponse.json({ success: false, error: { code: 'MISSING_CREDENTIALS' } }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: { code: 'API_ERROR', message: msg } }, { status: 500 });
  }
}
