import { NextResponse, type NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

function getSessionToken(request: NextRequest): string | undefined {
  const plain = request.cookies.get('authjs.session-token')?.value;
  if (plain) return plain;
  const chunks: string[] = [];
  for (let i = 0; i < 10; i++) {
    const chunk = request.cookies.get(`authjs.session-token.${i}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join('') : undefined;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login is public — always allow
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isUserRoute = pathname === '/user' || pathname.startsWith('/user/');

  if (!isAdminRoute && !isUserRoute) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  // Decode JWT — no DB call, pure cookie read
  const rawToken = getSessionToken(request);
  let token: { role?: string } | null = null;
  if (rawToken) {
    try {
      token = await decode({
        token: rawToken,
        secret: process.env.AUTH_SECRET!,
        salt: 'authjs.session-token',
      }) as { role?: string };
    } catch {
      token = null;
    }
  }

  // Not logged in → send to sign-in
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Non-admin on admin route → send to sign-in
  if (isAdminRoute && token.role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next({ request }));
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/user',
    '/user/:path*',
  ],
};
