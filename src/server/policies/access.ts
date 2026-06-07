import { prisma } from '@/lib/db/prisma';

// Coupons that grant free access. Add more here any time.
// `days` = how long the access lasts, counted from the user's signup date.
export const COUPONS: Record<string, { days: number }> = {
  VIPACCESS: { days: 7 },
};

export type AccessState = {
  active: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  role: 'ADMIN' | 'USER';
};

// Fresh DB lookup of a user's access — does NOT rely on the (cached) JWT,
// so a coupon redeemed mid-session takes effect immediately.
export async function getAccessByEmail(email: string): Promise<AccessState | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isPremium: true, premiumUntil: true },
  });
  if (!user) return null;

  const now = new Date();
  const withinWindow = !user.premiumUntil || user.premiumUntil > now;
  const active = user.role === 'ADMIN' || (user.isPremium && withinWindow);

  return {
    active,
    isPremium: user.isPremium,
    premiumUntil: user.premiumUntil ?? null,
    role: user.role,
  };
}
