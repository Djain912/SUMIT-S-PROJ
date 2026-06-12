import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  try {
    // Stop mass automated account creation
    const limit = await enforceRateLimit({
      request,
      key: 'auth-register',
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { message: 'Too many sign-up attempts. Please try again later.' } },
        { status: 429 },
      );
    }

    const body = await request.json() as { email?: string; password?: string; fullName?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.fullName?.trim().slice(0, 120) || null;

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required.' } }, { status: 400 });
    }
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: { message: 'Please enter a valid email address.' } }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: { message: 'Password must be at least 8 characters.' } }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: { message: 'An account with this email already exists.' } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const providerAccountId = `credentials:${email}`;

    const adminEmails = (
      process.env.SUPER_ADMIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      process.env.ADMIN_EMAILS?.split(',')[0] ?? ''
    ).trim().toLowerCase();

    const role = adminEmails && email === adminEmails ? 'ADMIN' : 'USER';

    await prisma.user.create({
      data: { email, passwordHash, fullName, providerAccountId, role },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: { message: 'Unable to create account. Please try again.' } }, { status: 500 });
  }
}
