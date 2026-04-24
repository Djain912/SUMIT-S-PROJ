import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export async function POST(request: Request) {
  const decision = enforceRateLimit({
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
        headers: {
          'Retry-After': String(decision.retryAfterSeconds),
        },
      },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
