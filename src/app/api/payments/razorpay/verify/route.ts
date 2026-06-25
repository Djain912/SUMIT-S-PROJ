import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { verifySignature, grantPremiumAccess } from '@/lib/payments/razorpay';
import { issueInvoice } from '@/lib/invoices/send';
import { sendPremiumWelcomeEmail } from '@/lib/email/welcome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Verifies the Razorpay checkout callback and, on success, grants premium.
// The webhook is the source of truth; this just makes access instant for the
// user who just paid. Both paths are idempotent.
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }
    const user = await requireAuthenticatedUser();

    const body = await request.json();
    const orderId: string = body.razorpay_order_id ?? '';
    const paymentId: string = body.razorpay_payment_id ?? '';
    const signature: string = body.razorpay_signature ?? '';
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ success: false, error: { message: 'Missing payment details' } }, { status: 400 });
    }

    // Signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const valid = verifySignature(`${orderId}|${paymentId}`, signature, process.env.RAZORPAY_KEY_SECRET!);
    if (!valid) {
      return NextResponse.json({ success: false, error: { message: 'Payment could not be verified.' } }, { status: 400 });
    }

    // The order must belong to THIS user (never trust the client alone).
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ success: false, error: { message: 'Payment record not found.' } }, { status: 404 });
    }

    // Idempotent: if already granted, just report success.
    if (payment.status === 'PAID') {
      return NextResponse.json({ success: true, data: { premiumUntil: payment.grantedUntil } });
    }

    const premiumUntil = await grantPremiumAccess(user.id);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', razorpayPaymentId: paymentId, grantedUntil: premiumUntil },
    });

    // Increment coupon usage if a discount coupon was applied to this order.
    if (payment.couponCode) {
      await prisma.coupon.updateMany({
        where: { code: payment.couponCode },
        data: { redeemedCount: { increment: 1 } },
      }).catch(() => {});
    }

    // Generate PDF invoice + email it. Must be awaited — Vercel kills the function on response.
    await issueInvoice(payment.id).catch((err) => console.error('[verify] invoice error:', err));

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, fullName: true } });
    sendPremiumWelcomeEmail(fullUser?.email ?? user.email, fullUser?.fullName).catch((err) => console.error('[verify] welcome email failed:', err));

    return NextResponse.json({ success: true, data: { premiumUntil } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    }
    console.error('[payments/verify] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Verification failed. If you were charged, contact support.' } }, { status: 500 });
  }
}
