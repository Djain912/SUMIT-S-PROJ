import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

function getSafeNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith('/')) {
    return '/user';
  }
  return nextParam;
}

// NextAuth handles the OAuth code exchange at /api/auth/callback/google automatically.
// This route handles post-sign-in redirects from legacy links / email flows.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const safeNextPath = getSafeNextPath(requestUrl.searchParams.get('next'));

  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL('/sign-in', requestUrl.origin));
  }

  if (session.user.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
  }

  if (safeNextPath.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/user', requestUrl.origin));
  }

  return NextResponse.redirect(new URL(safeNextPath, requestUrl.origin));
}
