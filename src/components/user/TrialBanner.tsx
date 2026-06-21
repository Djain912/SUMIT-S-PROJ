import Link from 'next/link';
import { Clock, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { getTrialState } from '@/server/policies/access';
import { TRIAL_DAYS, TRIAL_MAX_MOCKS } from '@/lib/trial';

// Trial status card for the student dashboard. Renders only for users who are
// in (or just out of) their 7-day trial — paid/admin and scoped-coupon users
// see nothing.
export async function TrialBanner({ email }: { email: string }) {
  const [trial, freeChapters, totalChapters] = await Promise.all([
    getTrialState(email),
    prisma.chapter.count({ where: { level: 'LEVEL_1', isPublished: true, isDeleted: false, isTrialFree: true } }),
    prisma.chapter.count({ where: { level: 'LEVEL_1', isPublished: true, isDeleted: false } }),
  ]);

  if (!trial || trial.hasFullAccess) return null;
  if (!trial.inTrial && !trial.expired) return null; // no trial window at all

  const lockedChapters = Math.max(0, totalChapters - freeChapters);

  if (trial.expired) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-base font-bold text-amber-900">Your free trial has ended</p>
              <p className="mt-1 text-sm text-amber-700">
                Unlock full access to continue your preparation — all your progress is saved.
              </p>
            </div>
          </div>
          <Link
            href="/get-access"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  const accessible = [
    `${freeChapters} ${freeChapters === 1 ? 'chapter' : 'chapters'}: Notes`,
    `${freeChapters} ${freeChapters === 1 ? 'chapter' : 'chapters'}: MCQs`,
    `${freeChapters} ${freeChapters === 1 ? 'chapter' : 'chapters'}: Quick Revision & Key Takeaways`,
    `${TRIAL_MAX_MOCKS} full-length mock tests`,
    'Chartix Scholar — 10 questions/day',
  ];
  const locked = [
    `${lockedChapters} more ${lockedChapters === 1 ? 'chapter' : 'chapters'} of notes, MCQs & revision`,
    'Full 3,500+ question bank',
    'Unlimited mock exams',
    'Unlimited Chartix Scholar',
    'Unlimited Indicator Lab',
  ];

  const progressPct = Math.round((trial.dayOfTrial / TRIAL_DAYS) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      {/* Header strip */}
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
            <Sparkles className="h-3 w-3" /> Free Trial Active
          </span>
          <p className="mt-2 text-xl font-bold text-emerald-900">
            Day {trial.dayOfTrial} of {TRIAL_DAYS}
          </p>
          <p className="text-sm font-medium text-emerald-700">
            {trial.daysRemaining === 0
              ? 'Ends today'
              : `${trial.daysRemaining} ${trial.daysRemaining === 1 ? 'day' : 'days'} remaining`}
          </p>
        </div>
        <Link
          href="/get-access"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Unlock Full Access
        </Link>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 sm:px-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Accessible vs locked */}
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">Included in your trial</p>
          <ul className="space-y-2">
            {accessible.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Unlocks with full access</p>
          <ul className="space-y-2">
            {locked.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
