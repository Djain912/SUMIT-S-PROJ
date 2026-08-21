import { computeTrialState } from '@/lib/trial';

// Shared between the admin Users/Leads server page and its API route so the
// two can never drift again — this used to be duplicated and one copy only
// ever surfaced a single collapsed trial with no level attached.

export type CmtLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
export const CMT_LEVELS: CmtLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

export type LevelBadge = {
  level: CmtLevel;
  status: 'trial-active' | 'trial-expired' | 'entitled' | 'none';
  dayOfTrial: number;
  daysRemaining: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: string | null;
  couponRedeemed: string | null;
  entitlementCoupon: string | null;
  entitlementExpiry: string | null;
  signInMethod: 'Email' | 'Google';
  quizAttempts: number;
  joinedAt: string;
  fullAccess: boolean;
  purchasedLevels: CmtLevel[];
  levels: LevelBadge[];
  lastLoginAt: string | null;
  loginCount: number;
  mcqAttempted: number;
  mockAttempted: number;
};

export type RawUserForAdmin = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: Date | null;
  couponRedeemed: string | null;
  passwordHash: string | null;
  createdAt: Date;
  // DEPRECATED, pre-LevelTrial signups only (superseded by /start-trial).
  // A handful of users signed up in the window just before that migration
  // shipped and never got a LevelTrial row backfilled — without this
  // fallback they'd wrongly show "Not started" despite an active trial.
  trialStartedAt: Date | null;
  trialExpiresAt: Date | null;
  _count: { quizAttempts: number };
  entitlements: { couponCode: string | null; expiresAt: Date; chapter: { level: CmtLevel } }[];
  levelTrials: { level: CmtLevel; startedAt: Date; expiresAt: Date }[];
  payments: { level: CmtLevel; amount: number; createdAt: Date }[];
  activity: { lastLoginAt: Date | null; loginCount: number; mcqAttempted: number; mockAttempted: number } | null;
};

export function buildUserRow(u: RawUserForAdmin): AdminUserRow {
  const now = new Date();
  const ent = u.entitlements[0] ?? null; // furthest-expiry entitlement, for the legacy coupon column
  const fullAccess = u.role === 'ADMIN' || (u.isPremium && (!u.premiumUntil || u.premiumUntil > now));

  const entitledLevels = new Set(u.entitlements.map((e) => e.chapter.level));
  const purchasedLevels = [...new Set(u.payments.map((p) => p.level))];
  const trialByLevel = new Map(u.levelTrials.map((t) => [t.level, t]));

  const levels: LevelBadge[] = CMT_LEVELS.map((level) => {
    if (entitledLevels.has(level)) {
      return { level, status: 'entitled', dayOfTrial: 0, daysRemaining: 0 };
    }
    let trial = trialByLevel.get(level);
    // Fallback for the pre-migration gap described above: only applies to
    // LEVEL_1 (the only level that existed before LevelTrial), and only when
    // no real LevelTrial row exists for it.
    if (!trial && level === 'LEVEL_1' && u.trialStartedAt && u.trialExpiresAt) {
      trial = { level, startedAt: u.trialStartedAt, expiresAt: u.trialExpiresAt };
    }
    if (trial) {
      const state = computeTrialState(trial.startedAt, trial.expiresAt, now);
      return {
        level,
        status: state.inTrial ? 'trial-active' : 'trial-expired',
        dayOfTrial: state.dayOfTrial,
        daysRemaining: state.daysRemaining,
      };
    }
    return { level, status: 'none', dayOfTrial: 0, daysRemaining: 0 };
  });

  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName ?? null,
    role: u.role,
    isPremium: u.isPremium,
    premiumUntil: u.premiumUntil ? u.premiumUntil.toISOString() : null,
    couponRedeemed: u.couponRedeemed ?? null,
    entitlementCoupon: ent?.couponCode ?? null,
    entitlementExpiry: ent ? ent.expiresAt.toISOString() : null,
    signInMethod: u.passwordHash ? 'Email' : 'Google',
    quizAttempts: u._count.quizAttempts,
    joinedAt: u.createdAt.toISOString(),
    fullAccess,
    purchasedLevels,
    levels,
    lastLoginAt: u.activity?.lastLoginAt ? u.activity.lastLoginAt.toISOString() : null,
    loginCount: u.activity?.loginCount ?? 0,
    mcqAttempted: u.activity?.mcqAttempted ?? 0,
    mockAttempted: u.activity?.mockAttempted ?? 0,
  };
}
