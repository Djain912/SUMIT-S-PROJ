import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { getPriceUnits, applyDiscount, type SupportedCurrency } from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';

// Validates a discount coupon and returns the discounted price.
// Read-only — does not modify any state. Safe to call on every keystroke.
export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();

    const body = await request.json();
    const code = String(body?.code ?? '').trim().toUpperCase();
    const currency: SupportedCurrency = body?.currency === 'USD' ? 'USD' : 'INR';
    if (!code) {
      return NextResponse.json({ success: false, error: { message: 'Enter a coupon code.' } }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ success: false, error: { message: 'Invalid or expired coupon code.' } }, { status: 400 });
    }
    if (!coupon.discountType || coupon.discountValue == null) {
      return NextResponse.json({ success: false, error: { message: 'This code grants free access — use the "Have a coupon?" box below instead.' } }, { status: 400 });
    }
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return NextResponse.json({ success: false, error: { message: 'This coupon has reached its redemption limit.' } }, { status: 400 });
    }
    // Fixed-amount coupons are defined in paise and only apply to INR orders.
    if (coupon.discountType === 'FIXED' && currency === 'USD') {
      return NextResponse.json({ success: false, error: { message: 'This coupon is only valid for INR payments.' } }, { status: 400 });
    }
    // Minimum order check only applies to INR (minOrderPaise is an INR field).
    if (currency === 'INR' && coupon.minOrderPaise) {
      const baseINR = getPriceUnits('INR');
      if (baseINR < coupon.minOrderPaise) {
        const minRupees = Math.round(coupon.minOrderPaise / 100);
        return NextResponse.json({ success: false, error: { message: `This coupon requires a minimum order of ₹${minRupees.toLocaleString('en-IN')}.` } }, { status: 400 });
      }
    }

    const basePrice = getPriceUnits(currency);
    const { discountPaise, finalPaise } = applyDiscount(basePrice, coupon.discountType, coupon.discountValue);

    let label: string;
    if (coupon.discountType === 'PERCENT') {
      if (currency === 'USD') {
        const savingsUSD = (discountPaise / 100).toFixed(2).replace(/\.00$/, '');
        label = `${coupon.discountValue}% off — you save $${savingsUSD}`;
      } else {
        const savingsRupees = Math.round(discountPaise / 100);
        label = `${coupon.discountValue}% off — you save ₹${savingsRupees.toLocaleString('en-IN')}`;
      }
    } else {
      const savingsRupees = Math.round(discountPaise / 100);
      label = `₹${savingsRupees.toLocaleString('en-IN')} off`;
    }

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
