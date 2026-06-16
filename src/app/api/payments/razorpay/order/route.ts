import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { getAccessByEmail } from '@/server/policies/access';
import { prisma } from '@/lib/db/prisma';
import {
  getRazorpay, razorpayConfigured, LEVEL1_PRICE_PAISE, PLAN_LEVEL,
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

    const order = await getRazorpay().orders.create({
      amount: LEVEL1_PRICE_PAISE,
      currency: 'INR',
      receipt: `cmt1_${user.id.slice(-10)}_${Date.now().toString(36)}`, // Razorpay caps receipt at 40 chars
      notes: { userId: user.id, level: PLAN_LEVEL },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        level: PLAN_LEVEL,
        amount: LEVEL1_PRICE_PAISE,
        currency: 'INR',
        razorpayOrderId: order.id,
        status: 'CREATED',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: LEVEL1_PRICE_PAISE,
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
