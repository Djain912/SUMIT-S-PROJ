import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TrendingUp, CheckCircle, Lock, Clock } from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { hasAnyAccess } from '@/server/policies/access';
import { CouponRedeemForm } from '@/components/get-access-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unlock Chartix',
  robots: { index: false, follow: false },
};

const LEVEL_1_FEATURES = [
  'All Level 1 study notes (chapter-wise)',
  '2000+ practice MCQs at exam difficulty',
  'Unlimited mock tests & custom quizzes',
  'Performance analytics dashboard',
  'Chartix Scholar (CMT-trained chatbot)',
  'Progress tracking & streaks',
];

export default async function GetAccessPage() {
  const session = await auth();
  const email = session?.user?.email;

  // Not signed in → send to sign-up, then back here.
  if (!email) redirect('/sign-up?next=/get-access');

  // Already have access (full or scoped) → no need for this page.
  if (await hasAnyAccess(email)) redirect('/user');

  return (
    <div className="min-h-screen bg-[#f0f7f4]">
      {/* Nav */}
      <nav className="border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-emerald-900">Chartix</span>
          </Link>
          <Link href="/api/auth/signout" className="text-sm font-medium text-zinc-500 hover:text-emerald-700">
            Sign out
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <Lock className="h-3 w-3" /> Members Only
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            Unlock your CMT prep
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Get full access to Chartix Level 1 — notes, quizzes, mock tests, analytics and Chartix Scholar.
          </p>
        </div>

        {/* Level 1 card */}
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-emerald-200 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">CMT Level 1</p>
              <div className="mt-1 flex items-end gap-1.5">
                <span className="text-3xl font-extrabold text-emerald-900">₹6,999</span>
                <span className="mb-1 text-sm text-zinc-400">per level</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white">L1</div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">6 months access</span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {LEVEL_1_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-sm text-zinc-600">{f}</span>
              </li>
            ))}
          </ul>

          {/* Payment coming soon */}
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Online payments are launching soon. For now, access is by invite coupon only.
          </div>

          {/* Coupon */}
          <div className="mt-5 border-t border-zinc-100 pt-5">
            <CouponRedeemForm />
          </div>
        </div>

        {/* Levels 2 & 3 — coming soon */}
        <div className="mx-auto mt-6 max-w-md">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Also on the way
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['CMT Level 2', 'CMT Level 3'].map((lvl) => (
              <div key={lvl} className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-5 text-center">
                <Lock className="mx-auto h-5 w-5 text-zinc-300" />
                <p className="mt-2 text-sm font-semibold text-zinc-500">{lvl}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-500">Coming Soon</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
