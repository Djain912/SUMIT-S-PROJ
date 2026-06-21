import { prisma } from '@/lib/db/prisma';
import { computeTrialState, type TrialState } from '@/lib/trial';

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
    select: { id: true, role: true, isPremium: true, premiumUntil: true, createdAt: true },
  });
  if (!user) return null;

  const now = new Date();
  const withinWindow = !user.premiumUntil || user.premiumUntil > now;
  const active = user.role === 'ADMIN' || (user.isPremium && withinWindow);

  // If the user has no full-premium access, check for scoped (chapter-level)
  // entitlements granted by a coupon — these store their expiry separately.
  if (!active && user.role !== 'ADMIN') {
    const ents = await prisma.entitlement.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      select: { expiresAt: true },
      orderBy: { expiresAt: 'desc' },
      take: 1,
    });
    if (ents.length > 0) {
      return {
        active: true,
        isPremium: true,
        premiumUntil: ents[0].expiresAt,
        role: user.role,
        createdAt: user.createdAt,
      };
    }
  }

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
// users get `full: true`. Everyone else gets the union of: chapters they hold an
// unexpired entitlement for (scoped coupon) PLUS the admin-flagged trial-free
// chapters while their 7-day trial is still active.
export async function getChapterAccess(email: string): Promise<ChapterAccess> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true, trialStartedAt: true, trialExpiresAt: true },
  });
  if (!user) return { full: false, chapterIds: new Set() };

  const now = new Date();
  const full = user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now));
  if (full) return { full: true, chapterIds: new Set() };

  const ids = new Set<string>();

  const ents = await prisma.entitlement.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
    select: { chapterId: true },
  });
  ents.forEach((e) => ids.add(e.chapterId));

  // Active trial unlocks the chapters an admin marked as trial-free.
  const trial = computeTrialState(user.trialStartedAt, user.trialExpiresAt, now);
  if (trial.inTrial) {
    const freeChapters = await prisma.chapter.findMany({
      where: { isTrialFree: true, isDeleted: false, isPublished: true },
      select: { id: true },
    });
    freeChapters.forEach((c) => ids.add(c.id));
  }

  return { full: false, chapterIds: ids };
}

// True when the user has ANY access at all (full premium, a live entitlement,
// or an active trial). Used to admit users into the student area.
export async function hasAnyAccess(email: string): Promise<boolean> {
  const access = await getChapterAccess(email);
  return access.full || access.chapterIds.size > 0;
}

// Trial status for UI (banner, dashboard, conversion prompts) — also reports
// whether the user already holds full paid/admin access (in which case no
// trial messaging should show).
export type UserTrialState = TrialState & { hasFullAccess: boolean };

export async function getTrialState(email: string): Promise<UserTrialState | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isPremium: true, premiumUntil: true, trialStartedAt: true, trialExpiresAt: true },
  });
  if (!user) return null;

  const now = new Date();
  const hasFullAccess = user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now));
  return { ...computeTrialState(user.trialStartedAt, user.trialExpiresAt, now), hasFullAccess };
}
