import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; fullName?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.fullName?.trim() || null;

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required.' } }, { status: 400 });
    }
    if (password.length < 8) {
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
