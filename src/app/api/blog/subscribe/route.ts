import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit({
    request: req,
    key: 'blog-subscribe',
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body.email as string | undefined)?.trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const existing = await prisma.blogSubscriber.findUnique({ where: { email } });
  if (existing) {
    // Return success silently — don't reveal who is already subscribed
    return NextResponse.json({ success: true });
  }

  await prisma.blogSubscriber.create({ data: { email } });
  return NextResponse.json({ success: true });
}
