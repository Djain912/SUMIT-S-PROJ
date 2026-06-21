import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { LEVEL1_PRICE_PAISE, applyDiscount } from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';

// Validates a discount coupon and returns the discounted price.
// Read-only — does not modify any state. Safe to call on every keystroke.
export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();

    const body = await request.json();
    const code = String(body?.code ?? '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: { message: 'Enter a coupon code.' } }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ success: false, error: { message: 'Invalid or expired coupon code.' } }, { status: 400 });
    }
    if (!coupon.discountType || coupon.discountValue == null) {
      // It's a free-access coupon, not a checkout discount
      return NextResponse.json({ success: false, error: { message: 'This code grants free access — use the "Have a coupon?" box below instead.' } }, { status: 400 });
    }
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return NextResponse.json({ success: false, error: { message: 'This coupon has reached its redemption limit.' } }, { status: 400 });
    }
    if (coupon.minOrderPaise && LEVEL1_PRICE_PAISE < coupon.minOrderPaise) {
      const minRupees = Math.round(coupon.minOrderPaise / 100);
      return NextResponse.json({ success: false, error: { message: `This coupon requires a minimum order of ₹${minRupees.toLocaleString('en-IN')}.` } }, { status: 400 });
    }

    const { discountPaise, finalPaise } = applyDiscount(
      LEVEL1_PRICE_PAISE,
      coupon.discountType,
      coupon.discountValue,
    );

    const savingsRupees = Math.round(discountPaise / 100);
    const label = coupon.discountType === 'PERCENT'
      ? `${coupon.discountValue}% off — you save ₹${savingsRupees.toLocaleString('en-IN')}`
      : `₹${savingsRupees.toLocaleString('en-IN')} off`;

    return NextResponse.json({
      success: true,
      data: { code, discountPaise, finalPaise, label },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Could not validate coupon.' } }, { status: 500 });
  }
}
