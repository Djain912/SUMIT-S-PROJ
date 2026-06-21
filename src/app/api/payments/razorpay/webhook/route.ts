import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifySignature, grantPremiumAccess } from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Razorpay webhook — the authoritative confirmation of payment. Configure the
// endpoint URL + secret in the Razorpay dashboard (Settings → Webhooks) and
// subscribe to "payment.captured" and "order.paid". Grants access reliably
// even if the user closed the browser before the callback ran.
export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    // Read the RAW body — signature is computed over the exact bytes sent.
    const raw = await request.text();

    if (!secret || !signature || !verifySignature(raw, signature, secret)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        order?: { entity?: { id?: string } };
      };
    };

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const orderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
      const paymentId = event.payload?.payment?.entity?.id;
      if (orderId) {
        const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
        if (payment && payment.status !== 'PAID') {
          const premiumUntil = await grantPremiumAccess(payment.userId);
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'PAID', razorpayPaymentId: paymentId ?? payment.razorpayPaymentId, grantedUntil: premiumUntil },
          });
          if (payment.couponCode) {
            await prisma.coupon.updateMany({
              where: { code: payment.couponCode },
              data: { redeemedCount: { increment: 1 } },
            }).catch(() => {});
          }
        }
      }
    }

    // Always 200 after a verified signature so Razorpay stops retrying.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[payments/webhook] error:', error);
    // 500 → Razorpay retries later, which is the behaviour we want on a real failure.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
