import { NextResponse, type NextRequest } from 'next/server';

const protectedAdminRoutes = ['/admin'];
const publicAdminRoutes = ['/admin/login'];
const protectedUserRoutes = ['/user'];
const authRoutes = ['/sign-in', '/sign-up', '/reset-password'];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin login — no auth needed
  if (publicAdminRoutes.some((route) => pathname.startsWith(route))) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  const isProtectedAdmin = protectedAdminRoutes.some((r) => pathname.startsWith(r));
  const isProtectedUser = protectedUserRoutes.some((r) => pathname.startsWith(r));
  const isProtected = isProtectedAdmin || isProtectedUser;
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));

  // Fast cookie-only check — no Supabase network call in middleware
  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name === 'sb-access-token' ||
        cookie.name.includes('-auth-token'),
    );

  if (isProtected && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isProtectedAdmin ? '/admin/login' : '/sign-in';
    redirectUrl.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  return applySecurityHeaders(NextResponse.next({ request }));
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
