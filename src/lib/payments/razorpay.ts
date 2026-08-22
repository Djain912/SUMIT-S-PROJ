import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';

// Per-level pricing — all levels same price, matches the pricing page.
export const PRICE_PAISE     = 699900; // ₹6,999 for Indian users
export const PRICE_USD_CENTS =   9900; // $99.00 for international users
export const ACCESS_MONTHS = 6;

export type PurchaseLevel = 'LEVEL_1' | 'LEVEL_2';

export type SupportedCurrency = 'INR' | 'USD';

export function getPriceUnits(currency: SupportedCurrency): number {
  return currency === 'USD' ? PRICE_USD_CENTS : PRICE_PAISE;
}

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

// Computes the discounted amount for a coupon.
export function applyDiscount(
  orderPaise: number,
  discountType: 'PERCENT' | 'FIXED',
  discountValue: number,
): { discountPaise: number; finalPaise: number } {
  const raw = discountType === 'PERCENT'
    ? Math.floor(orderPaise * discountValue / 100)
    : discountValue;
  const finalPaise = Math.max(100, orderPaise - raw); // never below ₹1
  return { discountPaise: orderPaise - finalPaise, finalPaise };
}

// Grants 6 months access to all published chapters of a specific CMT level
// via Entitlements. Per-level: buying Level 1 does not unlock Level 2, and
// vice versa. Idempotent — safe to call twice (extends expiry on re-purchase).
export async function grantLevelAccess(userId: string, level: PurchaseLevel): Promise<Date> {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + ACCESS_MONTHS);

  const chapters = await prisma.chapter.findMany({
    where: { level, isPublished: true, isDeleted: false },
    select: { id: true },
  });

  await prisma.$transaction(
    chapters.map((ch) =>
      prisma.entitlement.upsert({
        where: { userId_chapterId: { userId, chapterId: ch.id } },
        create: { userId, chapterId: ch.id, expiresAt },
        update: { expiresAt },
      }),
    ),
  );

  return expiresAt;
}

// Legacy: grants full (all-level) premium access. Kept for admin/coupon grants.
export async function grantPremiumAccess(userId: string): Promise<Date> {
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + ACCESS_MONTHS);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } });
  const premiumUntil = user?.premiumUntil && user.premiumUntil > sixMonths ? user.premiumUntil : sixMonths;
  await prisma.user.update({ where: { id: userId }, data: { isPremium: true, premiumUntil } });
  return premiumUntil;
}
