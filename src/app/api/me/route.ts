/**
 * /api/me  — authenticated user info (role, premium status, etc.)
 *
 * Previously lived at /api/auth/session which conflicted with NextAuth's
 * own session endpoint. Moved here to fix ClientFetchError.
 */
import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { message: 'Unable to load session' } },
      { status: 500 }
    );
  }
}
