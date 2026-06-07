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
    code = String(body?.code ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const coupon = COUPONS[code.toUpperCase()];
  if (!coupon) {
    return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 });
  }

  // Load the DB user (need their signup date — access runs from date of signup).
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, createdAt: true, premiumUntil: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  // Access is valid for `coupon.days` from the date of signup.
  const premiumUntil = new Date(dbUser.createdAt);
  premiumUntil.setDate(premiumUntil.getDate() + coupon.days);

  if (premiumUntil <= new Date()) {
    return NextResponse.json(
      { error: 'This coupon offers free access for a limited time from signup, and that window has already passed.' },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { isPremium: true, premiumUntil, couponRedeemed: code.toUpperCase() },
  });

  return NextResponse.json({ ok: true, premiumUntil: premiumUntil.toISOString() });
}
