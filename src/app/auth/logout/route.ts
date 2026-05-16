import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth/auth';

export async function GET(request: Request) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL('/sign-in', request.url));
}
