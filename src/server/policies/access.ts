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
  createdAt: Date;
};

// Fresh DB lookup of a user's access — does NOT rely on the (cached) JWT,
// so a coupon redeemed mid-session takes effect immediately.
export async function getAccessByEmail(email: string): Promise<AccessState | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isPremium: true, premiumUntil: true, createdAt: true },
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
    createdAt: user.createdAt,
  };
}

export type ChapterAccess = {
  // true when the user can see EVERYTHING (admin or full premium)
  full: boolean;
  // when not full, the exact set of chapter IDs they currently have access to
  chapterIds: Set<string>;
};

// Resolves which chapters a user can access right now. Admins and full-premium
// users get `full: true`. Everyone else gets the set of chapters they hold an
// unexpired entitlement for (granted by redeeming a scoped coupon).
export async function getChapterAccess(email: string): Promise<ChapterAccess> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true },
  });
  if (!user) return { full: false, chapterIds: new Set() };

  const now = new Date();
  const full = user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now));
  if (full) return { full: true, chapterIds: new Set() };

  const ents = await prisma.entitlement.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
    select: { chapterId: true },
  });
  return { full: false, chapterIds: new Set(ents.map((e) => e.chapterId)) };
}

// True when the user has ANY access at all (full OR at least one live chapter).
// Used to decide whether to let them into the student area.
export async function hasAnyAccess(email: string): Promise<boolean> {
  const access = await getChapterAccess(email);
  return access.full || access.chapterIds.size > 0;
}
