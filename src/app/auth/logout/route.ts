import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL('/sign-in', request.url);
  return NextResponse.redirect(redirectUrl);
}
