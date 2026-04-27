import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase';
import { requireAuthenticatedUser } from '@/server/policies/auth';

function getSafeNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith('/')) {
    return '/user';
  }

  return nextParam;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const safeNextPath = getSafeNextPath(requestUrl.searchParams.get('next'));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const signInUrl = new URL('/sign-in', requestUrl.origin);
      signInUrl.searchParams.set('error', 'oauth_callback_failed');
      return NextResponse.redirect(signInUrl);
    }
  }

  try {
    const user = await requireAuthenticatedUser();

    if (user.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', requestUrl.origin));
    }

    if (safeNextPath.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/user', requestUrl.origin));
    }

    return NextResponse.redirect(new URL(safeNextPath, requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL('/sign-in', requestUrl.origin));
  }
}
