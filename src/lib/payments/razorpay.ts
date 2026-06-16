import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';

// Level I plan: ₹6,999 for 6 months of premium access (matches the pricing page).
export const LEVEL1_PRICE_PAISE = 699900;
export const ACCESS_MONTHS = 6;
export const PLAN_LEVEL = 'LEVEL_1' as const;

let client: Razorpay | null = null;

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay(): Razorpay {
  if (!razorpayConfigured()) throw new Error('Razorpay keys are not configured');
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

// Timing-safe HMAC-SHA256 comparison. Used to verify both the checkout
// callback signature and the webhook signature.
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Grants 6 months of premium access, extending any existing access rather than
// shortening it. Returns the resulting premium expiry.
export async function grantPremiumAccess(userId: string): Promise<Date> {
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + ACCESS_MONTHS);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } });
  const premiumUntil = user?.premiumUntil && user.premiumUntil > sixMonths ? user.premiumUntil : sixMonths;
  await prisma.user.update({ where: { id: userId }, data: { isPremium: true, premiumUntil } });
  return premiumUntil;
}
