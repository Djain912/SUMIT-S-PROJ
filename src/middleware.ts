import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminLoginPage = pathname.startsWith('/admin/login');
  if (isAdminLoginPage) {
    return NextResponse.next({ request });
  }

  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/reset-password');
  const isProtectedPage = pathname.startsWith('/admin') || pathname.startsWith('/user');

  // Fast-path check: avoid Supabase round-trips in middleware for every navigation.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name === 'sb-access-token' || cookie.name.includes('-auth-token'));

  if (!hasSessionCookie && isProtectedPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/sign-in';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!hasSessionCookie && isAuthPage) {
    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/user/:path*',
    '/sign-in',
    '/sign-up',
    '/reset-password',
  ],
};