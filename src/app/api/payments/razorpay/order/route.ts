import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { getAccessByEmail } from '@/server/policies/access';
import { prisma } from '@/lib/db/prisma';
import {
  getRazorpay, razorpayConfigured, PLAN_LEVEL, applyDiscount, getPriceUnits,
  type SupportedCurrency,
} from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Creates a Razorpay order for the Level I plan and records it as a pending
// Payment. The client opens Razorpay Checkout with the returned orderId.
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }
    if (!razorpayConfigured()) {
      return NextResponse.json({ success: false, error: { message: 'Payments are not available yet.' } }, { status: 503 });
    }

    const user = await requireAuthenticatedUser();

    const limit = await enforceRateLimit({
      request, key: 'pay-order', maxRequests: 10, windowMs: 10 * 60 * 1000, identifier: user.id,
    });
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: { message: 'Too many attempts. Please try again shortly.' } }, { status: 429 });
    }

    // Already have active access? No need to pay again.
    const access = await getAccessByEmail(user.email);
    if (access?.active) {
      return NextResponse.json({ success: false, error: { message: 'You already have active access.' } }, { status: 409 });
    }

    // Optional discount coupon — re-validate server-side even if client already checked.
    const body = await request.json().catch(() => ({})) as {
      currency?: string;
      couponCode?: string;
      billingName?: string;
      billingPhone?: string;
      billingEmail?: string;
      billingAddress?: string;
      billingCity?: string;
      billingState?: string;
      billingPincode?: string;
      billingGst?: string;
    };

    // Validate currency — only INR and USD are supported.
    const currency: SupportedCurrency =
      body.currency === 'USD' ? 'USD' : 'INR';

    const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;

    const basePrice = getPriceUnits(currency);
    let chargeAmount = basePrice;
    let discountPaise: number | null = null;

    // Coupons are INR-only (fixed amounts in paise).
    if (couponCode && currency === 'INR') {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || !coupon.isActive || !coupon.discountType || coupon.discountValue == null) {
        return NextResponse.json({ success: false, error: { message: 'Coupon is no longer valid.' } }, { status: 400 });
      }
      if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
        return NextResponse.json({ success: false, error: { message: 'Coupon has reached its limit.' } }, { status: 400 });
      }
      const result = applyDiscount(basePrice, coupon.discountType, coupon.discountValue);
      chargeAmount = result.finalPaise;
      discountPaise = result.discountPaise;
    }

    const order = await getRazorpay().orders.create({
      amount: chargeAmount,
      currency,
      receipt: `cmt1_${user.id.slice(-10)}_${Date.now().toString(36)}`,
      notes: { userId: user.id, level: PLAN_LEVEL },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        level: PLAN_LEVEL,
        amount: chargeAmount,
        currency,
        razorpayOrderId: order.id,
        status: 'CREATED',
        ...(couponCode ? { couponCode, discountPaise } : {}),
        billingName:    body.billingName    ? String(body.billingName).trim()    : null,
        billingPhone:   body.billingPhone   ? String(body.billingPhone).trim()   : null,
        billingEmail:   body.billingEmail   ? String(body.billingEmail).trim()   : null,
        billingAddress: body.billingAddress ? String(body.billingAddress).trim() : null,
        billingCity:    body.billingCity    ? String(body.billingCity).trim()    : null,
        billingState:   body.billingState   ? String(body.billingState).trim()   : null,
        billingPincode: body.billingPincode ? String(body.billingPincode).trim() : null,
        billingGst:     body.billingGst     ? String(body.billingGst).trim()     : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: chargeAmount,
        currency: 'INR',
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        prefill: { name: user.fullName ?? '', email: user.email },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    }
    console.error('[payments/order] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not start payment. Please try again.' } }, { status: 500 });
  }
}
