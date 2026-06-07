import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { COUPONS } from '@/server/policies/access';

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let code = '';
  try {
    const body = await request.json();
    code = String(body?.code ?? '').trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, createdAt: true, premiumUntil: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  // 1) Admin-managed coupon (stored in the DB).
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (coupon) {
    if (!coupon.isActive) {
      return NextResponse.json({ error: 'This coupon is no longer active.' }, { status: 400 });
    }
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return NextResponse.json({ error: 'This coupon has reached its redemption limit.' }, { status: 400 });
    }

    const now = new Date();
    const newExpiry = new Date(now.getTime() + coupon.days * 24 * 60 * 60 * 1000);

    if (coupon.allChapters) {
      // Full access — extend premium window if the new expiry is later.
      const premiumUntil = dbUser.premiumUntil && dbUser.premiumUntil > newExpiry ? dbUser.premiumUntil : newExpiry;
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { isPremium: true, premiumUntil, couponRedeemed: code },
      });
      await prisma.coupon.update({ where: { id: coupon.id }, data: { redeemedCount: { increment: 1 } } });
      return NextResponse.json({ ok: true, scope: 'full', premiumUntil: premiumUntil.toISOString() });
    }

    // Scoped access — grant one entitlement per chapter (extend if later).
    const chapterIds = Array.isArray(coupon.chapterIds) ? (coupon.chapterIds as string[]) : [];
    const valid = await prisma.chapter.findMany({
      where: { id: { in: chapterIds }, isDeleted: false },
      select: { id: true },
    });
    if (valid.length === 0) {
      return NextResponse.json({ error: 'This coupon has no chapters configured. Please contact support.' }, { status: 400 });
    }

    for (const { id: chapterId } of valid) {
      const existing = await prisma.entitlement.findUnique({
        where: { userId_chapterId: { userId: dbUser.id, chapterId } },
        select: { expiresAt: true },
      });
      const expiresAt = existing && existing.expiresAt > newExpiry ? existing.expiresAt : newExpiry;
      await prisma.entitlement.upsert({
        where: { userId_chapterId: { userId: dbUser.id, chapterId } },
        create: { userId: dbUser.id, chapterId, expiresAt, couponCode: code },
        update: { expiresAt, couponCode: code },
      });
    }

    await prisma.coupon.update({ where: { id: coupon.id }, data: { redeemedCount: { increment: 1 } } });
    return NextResponse.json({ ok: true, scope: 'chapters', chapters: valid.length, expiresAt: newExpiry.toISOString() });
  }

  // 2) Legacy hardcoded coupon (e.g. VIPACCESS) — full access from signup date.
  const legacy = COUPONS[code];
  if (legacy) {
    const premiumUntil = new Date(dbUser.createdAt);
    premiumUntil.setDate(premiumUntil.getDate() + legacy.days);
    if (premiumUntil <= new Date()) {
      return NextResponse.json(
        { error: 'This coupon offers free access for a limited time from signup, and that window has already passed.' },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { isPremium: true, premiumUntil, couponRedeemed: code },
    });
    return NextResponse.json({ ok: true, scope: 'full', premiumUntil: premiumUntil.toISOString() });
  }

  return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 });
}
