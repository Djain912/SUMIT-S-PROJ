/**
 * /api/auth/session
 *
 * This route MUST return the NextAuth session format so that
 * SessionProvider (next-auth/react) works correctly across the app.
 *
 * Previously this returned a custom { success, data } shape which
 * conflicted with NextAuth's own session endpoint → ClientFetchError.
 *
 * The custom user-role endpoint is now at /api/me
 */
import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json(null);
  // Return in NextAuth's expected format: { user, expires }
  return NextResponse.json(session);
}
