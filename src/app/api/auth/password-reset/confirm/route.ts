import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit({
      request, key: 'pwreset-confirm-ip', maxRequests: 20, windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many attempts. Please try again later.' } },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password;

    if (!token || !password) {
      return NextResponse.json({ success: false, error: { message: 'Missing token or password.' } }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ success: false, error: { message: 'Password must be at least 8 characters.' } }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });

    const invalid = NextResponse.json(
      { success: false, error: { message: 'This reset link is invalid or has expired. Please request a new one.' } },
      { status: 400 },
    );
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) return invalid;

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomically set the new password, mark this token consumed, and clear any
    // other outstanding tokens for the user.
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, consumedAt: null } }),
    ]);

    return NextResponse.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('[password-reset/confirm] error:', err);
    return NextResponse.json({ success: false, error: { message: 'Could not reset password. Please try again.' } }, { status: 500 });
  }
}
