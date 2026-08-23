import { prisma } from '@/lib/db/prisma';
import { computeTrialState, type TrialState } from '@/lib/trial';

export type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

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

// ── Per-level trials ────────────────────────────────────────────────────
// Each user gets one 7-day trial PER CMT level (see LevelTrial in the
// Prisma schema). A user can hold trials for more than one level at once —
// e.g. start Level 2's trial while Level 1's is still running — the unique
// constraint on (userId, level) only prevents reusing the SAME level twice.

type LoadedTrial = { level: Level; state: TrialState };

async function loadTrials(userId: string, now: Date): Promise<LoadedTrial[]> {
  const rows = await prisma.levelTrial.findMany({ where: { userId } });
  return rows.map((r) => ({
    level: r.level as Level,
    state: computeTrialState(r.startedAt, r.expiresAt, now),
  }));
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
// chapters for any level where their trial is currently active.
//
// `level` is optional — when omitted, chapters unlock for the union of ALL
// levels with an active trial (correct for callers that don't know/care which
// level a chapter belongs to). When provided, only that level's trial-free
// chapters count, even if another level's trial happens to also be active.
export async function getChapterAccess(email: string, level?: Level): Promise<ChapterAccess> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true },
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

  const trials = await loadTrials(user.id, now);
  let trialLevels = trials.filter((t) => t.state.inTrial).map((t) => t.level);
  if (level) trialLevels = trialLevels.filter((l) => l === level);

  if (trialLevels.length > 0) {
    const freeChapters = await prisma.chapter.findMany({
      where: { isTrialFree: true, isDeleted: false, isPublished: true, level: { in: trialLevels } },
      select: { id: true },
    });
    freeChapters.forEach((c) => ids.add(c.id));
  }

  return { full: false, chapterIds: ids };
}

// True when the user has ANY access at all (full premium, a live entitlement,
// or an active trial for any level). Used to admit users into the student area.
export async function hasAnyAccess(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true },
  });
  if (!user) return false;

  const now = new Date();
  const full = user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now));
  if (full) return true;

  // Any active trial (for any level) admits the user — they see locked
  // content + upgrade prompts even when no chapters are trial-free yet.
  const trials = await loadTrials(user.id, now);
  if (trials.some((t) => t.state.inTrial)) return true;

  // Scoped entitlements (chapter-level coupons)
  const ents = await prisma.entitlement.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
    select: { chapterId: true },
    take: 1,
  });
  return ents.length > 0;
}

// True when the user still has at least one CMT level (with published
// content) they have never started a trial for. Used to route a trial-less
// signup to the level picker instead of straight to the paywall.
export async function hasUnusedTrialLevel(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return false;

  const [trials, levelsWithContent] = await Promise.all([
    prisma.levelTrial.findMany({ where: { userId: user.id }, select: { level: true } }),
    prisma.chapter.groupBy({ by: ['level'], where: { isPublished: true, isDeleted: false }, _count: true }),
  ]);

  const triedLevels = new Set(trials.map((t) => t.level));
  return levelsWithContent.some((l) => !triedLevels.has(l.level));
}

// Trial status for UI (banner, dashboard, conversion prompts) — also reports
// whether the user already holds full paid/admin access (in which case no
// trial messaging should show), and which level the returned state is for.
//
// `level` is optional. Without it: the active trial with the furthest expiry
// wins; if none are active, the most-recently-expired one is used; if the
// user has never started any trial, `level` comes back null.
export type UserTrialState = TrialState & { hasFullAccess: boolean; level: Level | null };

export async function getTrialState(email: string, level?: Level): Promise<UserTrialState | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true },
  });
  if (!user) return null;

  const now = new Date();
  const hasFullAccess = user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now));

  const trials = await loadTrials(user.id, now);

  let chosen: LoadedTrial | undefined;
  if (level) {
    chosen = trials.find((t) => t.level === level);
  } else {
    const byExpiryDesc = (a: LoadedTrial, b: LoadedTrial) =>
      (b.state.expiresAt?.getTime() ?? 0) - (a.state.expiresAt?.getTime() ?? 0);
    const active = trials.filter((t) => t.state.inTrial).sort(byExpiryDesc);
    chosen = active[0] ?? [...trials].sort(byExpiryDesc)[0];
  }

  if (!chosen) {
    return { ...computeTrialState(null, null, now), hasFullAccess, level: null };
  }
  return { ...chosen.state, hasFullAccess, level: chosen.level };
}

// Per-level access summary — drives the dashboard/quiz level tabs.
export type LevelStatus = 'unavailable' | 'open' | 'trial-available' | 'expired';
export type LevelSummary = { level: Level; status: LevelStatus; daysRemaining: number; chapterCount: number };

export async function getLevelAccessSummary(email: string): Promise<LevelSummary[]> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isPremium: true, premiumUntil: true },
  });

  const now = new Date();
  const full = !!user && (user.role === 'ADMIN' || (user.isPremium && (!user.premiumUntil || user.premiumUntil > now)));

  const levels: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

  const chapterCounts = await prisma.chapter.groupBy({
    by: ['level'],
    where: { isPublished: true, isDeleted: false },
    _count: true,
  });
  const countByLevel = new Map<Level, number>(chapterCounts.map((c) => [c.level as Level, c._count]));

  const trials = user ? await loadTrials(user.id, now) : [];
  const trialByLevel = new Map(trials.map((t) => [t.level, t.state]));

  let entitledLevels = new Set<Level>();
  if (user && !full) {
    const ents = await prisma.entitlement.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      select: { chapter: { select: { level: true } } },
    });
    entitledLevels = new Set(ents.map((e) => e.chapter.level as Level));
  }

  return levels.map((level) => {
    const chapterCount = countByLevel.get(level) ?? 0;
    if (chapterCount === 0) {
      return { level, status: 'unavailable' as const, daysRemaining: 0, chapterCount: 0 };
    }
    if (full || entitledLevels.has(level)) {
      return { level, status: 'open' as const, daysRemaining: 0, chapterCount };
    }
    const trial = trialByLevel.get(level);
    if (trial?.inTrial) {
      return { level, status: 'open' as const, daysRemaining: trial.daysRemaining, chapterCount };
    }
    if (trial?.expired) {
      return { level, status: 'expired' as const, daysRemaining: 0, chapterCount };
    }
    return { level, status: 'trial-available' as const, daysRemaining: 0, chapterCount };
  });
}
