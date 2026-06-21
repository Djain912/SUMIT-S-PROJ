// Freemium trial — shared constants and pure helpers.
// Trial state that needs a DB read lives in src/server/policies/access.ts.

export const TRIAL_DAYS = 7;
export const TRIAL_SCHOLAR_DAILY = 10; // Chartix Scholar questions/day during trial
export const TRIAL_MAX_MOCKS = 2; // full-length mock tests allowed during trial

export type TrialState = {
  inTrial: boolean; // within an active (unexpired) trial window
  expired: boolean; // had a trial that has now ended
  startedAt: Date | null;
  expiresAt: Date | null;
  dayOfTrial: number; // 1-based day number, clamped to [1, TRIAL_DAYS]
  daysRemaining: number; // whole days left, >= 0
};

// Derives the trial state from a user's stored trial timestamps. Pure — no I/O.
export function computeTrialState(
  startedAt: Date | null,
  expiresAt: Date | null,
  now: Date = new Date(),
): TrialState {
  if (!startedAt || !expiresAt) {
    return { inTrial: false, expired: false, startedAt, expiresAt, dayOfTrial: 0, daysRemaining: 0 };
  }
  const expired = now >= expiresAt;
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((now.getTime() - startedAt.getTime()) / msPerDay);
  const dayOfTrial = Math.min(Math.max(elapsedDays + 1, 1), TRIAL_DAYS);
  const daysRemaining = expired ? 0 : Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay));
  return { inTrial: !expired, expired, startedAt, expiresAt, dayOfTrial, daysRemaining };
}
