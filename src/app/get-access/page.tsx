import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle, Lock, Clock } from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { getTrialState } from '@/server/policies/access';
import { CouponRedeemForm } from '@/components/get-access-client';
import { BuyButton } from '@/components/payments/BuyButton';
import { getVisitorCurrency } from '@/lib/geo/country';
import { getPriceUnits } from '@/lib/payments/razorpay';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unlock Chartix',
  robots: { index: false, follow: false },
};

const LEVEL_FEATURES: Record<string, string[]> = {
  LEVEL_1: [
    'All Level I study notes (12 chapters)',
    '1,000+ practice MCQs at exam difficulty',
    'Unlimited mock tests & custom quizzes',
    'Performance analytics dashboard',
    'Chartix Scholar (CMT-trained chatbot)',
    'Progress tracking & streaks',
  ],
  LEVEL_2: [
    'All Level II study notes (12 chapters)',
    '999 practice MCQs at exam difficulty',
    'Unlimited mock tests & custom quizzes',
    'Performance analytics dashboard',
    'Chartix Scholar (CMT-trained chatbot)',
    'Progress tracking & streaks',
  ],
};

export default async function GetAccessPage() {
  const session = await auth();
  const email = session?.user?.email;
  const currency = await getVisitorCurrency();
  const baseAmountUnits = getPriceUnits(currency);

  // Not signed in → send to sign-up, then back here.
  if (!email) redirect('/sign-up?next=/get-access');

  // Bounce only users with FULL all-levels access (admin or isPremium=true DB flag).
  // Level-specific buyers (Entitlement rows only, isPremium=false on DB) are allowed
  // in so they can purchase the other level.
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isPremium: true, premiumUntil: true },
  });
  const now = new Date();
  const hasFullAccess =
    dbUser?.role === 'ADMIN' ||
    (dbUser?.isPremium === true && (!dbUser.premiumUntil || dbUser.premiumUntil > now));
  if (hasFullAccess) redirect('/user');

  const trial = await getTrialState(email);
  const trialExpired = trial?.expired ?? false;
  const trialActive = trial?.inTrial ?? false;

  return (
    <div className="min-h-screen bg-[#f0f7f4]">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        {trialExpired && (
          <div className="mx-auto mb-8 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <Clock className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-base font-bold text-amber-900">Your free trial has ended</p>
            <p className="mt-1 text-sm text-amber-700">
              Unlock full access to continue your preparation — your progress is saved.
            </p>
          </div>
        )}
        {trialActive && (
          <div className="mx-auto mb-8 max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-base font-bold text-emerald-900">
              {trial?.daysRemaining === 1 ? 'Last day of your free trial' : `${trial?.daysRemaining} days left in your free trial`}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Upgrade now for full access to every chapter, unlimited mock tests and Chartix Scholar.
            </p>
          </div>
        )}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <Lock className="h-3 w-3" /> Members Only
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            Unlock your CMT prep
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Each plan gives 6 months of full access to that level — notes, quizzes, mock tests, analytics and Chartix Scholar.
          </p>
        </div>

        {/* Per-level purchase cards */}
        <div className="mx-auto mt-8 max-w-md space-y-5">
          {(['LEVEL_1', 'LEVEL_2'] as const).map((lvl) => {
            const label = lvl === 'LEVEL_2' ? 'CMT Level II' : 'CMT Level I';
            const badge = lvl === 'LEVEL_2' ? 'L2' : 'L1';
            return (
              <div key={lvl} className="rounded-2xl border border-emerald-200 bg-white p-7 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">{label}</p>
                    <div className="mt-1 flex items-end gap-1.5">
                      <span className="text-3xl font-extrabold text-emerald-900">
                        {currency === 'USD' ? '$99' : '₹6,999'}
                      </span>
                      <span className="mb-1 text-sm text-zinc-400">6 months access</span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white">{badge}</div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {LEVEL_FEATURES[lvl].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-sm text-zinc-600">{f}</span>
                    </li>
                  ))}
                </ul>

                <BuyButton
                  userName={session?.user?.name ?? ''}
                  userEmail={session?.user?.email ?? ''}
                  currency={currency}
                  baseAmountUnits={baseAmountUnits}
                  level={lvl}
                />
              </div>
            );
          })}

          {/* Coupon — applies to whichever level the user ends up buying */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Have a promo code?</p>
            <CouponRedeemForm />
          </div>
        </div>

        {/* Level 3 — coming soon */}
        <div className="mx-auto mt-6 max-w-xs">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-5 text-center">
            <Lock className="mx-auto h-5 w-5 text-zinc-300" />
            <p className="mt-2 text-sm font-semibold text-zinc-500">CMT Level III</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-500">Coming Soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
