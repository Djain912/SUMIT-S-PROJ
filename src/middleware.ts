import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        },
        remove(name, options) {
          request.cookies.set(name, '', options);
          response.cookies.set(name, '', options);
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-in') || 
                   request.nextUrl.pathname.startsWith('/sign-up') ||
                   request.nextUrl.pathname.startsWith('/reset-password');

  const isPublicPage = request.nextUrl.pathname === '/' || 
                     request.nextUrl.pathname.startsWith('/auth/') ||
                     request.nextUrl.pathname.startsWith('/api/auth/');

  if (error || !user) {
    if (!isAuthPage && !isPublicPage) {
      const redirectUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const isAdmin = user.email?.toLowerCase() === 'admin@financeprep.com';
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin') || 
                    request.nextUrl.pathname.startsWith('/api/admin');

  if (isAdminPage && !isAdmin) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage) {
    const redirectUrl = new URL(isAdmin ? '/admin' : '/user', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};