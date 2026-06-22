import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { passwordResetEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    'https://chartix.in'
  ).replace(/\/$/, '');
}

// Always responds with the same generic success message regardless of whether
// the email exists — prevents account-enumeration. Heavy work (token + email)
// only runs when there's a matching credentials account.
export async function POST(request: Request) {
  const genericOk = NextResponse.json({
    success: true,
    message: 'If an account exists for that email, a reset link is on its way.',
  });

  try {
    // Throttle per-IP and per-email to stop reset-link spamming.
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    const [byIp, byEmail] = await Promise.all([
      enforceRateLimit({ request, key: 'pwreset-req-ip', maxRequests: 10, windowMs: 60 * 60 * 1000 }),
      email
        ? enforceRateLimit({ request, key: 'pwreset-req-email', maxRequests: 4, windowMs: 60 * 60 * 1000, identifier: email })
        : Promise.resolve({ allowed: true }),
    ]);
    if (!byIp.allowed || !byEmail.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many requests. Please try again later.' } },
        { status: 429 },
      );
    }

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return genericOk;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, passwordHash: true },
    });

    // No account, or a Google-only account with no password to reset → say
    // nothing (still generic success).
    if (!user || !user.passwordHash) return genericOk;

    // Invalidate any outstanding tokens for this user, then issue a fresh one.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, consumedAt: null } });

    const rawToken = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${baseUrl()}/reset-password?token=${rawToken}`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset your Chartix password',
        html: passwordResetEmail({ resetUrl, firstName: user.fullName?.split(' ')[0] ?? null }),
      });
    } catch (err) {
      // Don't leak send failures to the client; log for ops.
      console.error('[password-reset/request] email send failed:', err);
    }

    return genericOk;
  } catch (err) {
    console.error('[password-reset/request] error:', err);
    // Still generic — never reveal internal state on this endpoint.
    return genericOk;
  }
}
