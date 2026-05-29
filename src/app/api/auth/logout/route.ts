import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth/auth';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export async function POST(request: Request) {
  const decision = await enforceRateLimit({
    request,
    key: 'auth:logout:post',
    maxRequests: 20,
    windowMs: 60_000,
  });

  if (!decision.allowed) {
    return NextResponse.json(
      { success: false, error: { message: 'Too many logout requests' } },
      {
        status: 429,
        headers: { 'Retry-After': String(decision.retryAfterSeconds) },
      },
    );
  }

  await signOut({ redirect: false });

  return NextResponse.json({ success: true });
}
