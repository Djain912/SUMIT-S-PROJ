import Link from 'next/link';
import { MessageSquareHeart, Sparkles } from 'lucide-react';
import { Suspense } from 'react';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserDashboardData } from '@/server/services/dashboard.service';
import { UserDashboardClient, type LevelStateMap } from '@/components/user/user-dashboard';
import { TrialBanner } from '@/components/user/TrialBanner';
import { OnboardingChecklist } from '@/components/user/OnboardingChecklist';
import { getLevelAccessSummary } from '@/server/policies/access';
import { GoogleAdsConversion } from '@/components/marketing/GoogleAdsConversion';

export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireAuthenticatedUser();
  const { welcome } = await searchParams;

  const summary = await getLevelAccessSummary(user.email);
  const levelStates = Object.fromEntries(
    summary.map((s) => [s.level, { status: s.status, daysRemaining: s.daysRemaining }]),
  ) as LevelStateMap;

  // Default to whichever level the user actually has open access to (paid,
  // entitled, or an active trial) — a Level-2-only trial user shouldn't land
  // on a fully-locked Level 1 board.
  const defaultLevel = summary.find((s) => s.status === 'open')?.level ?? 'LEVEL_1';
  const initialData = await getUserDashboardData(user.id, user.email, defaultLevel);

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study Hub</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Dashboard</h1>
          </div>
          <Link
            href="/user/feedback"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <MessageSquareHeart className="h-3.5 w-3.5" /> Give course feedback
          </Link>
        </div>
        {welcome === '1' && <Suspense><GoogleAdsConversion /></Suspense>}
        {welcome === '1' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Welcome to Chartix!</p>
              <p className="mt-0.5 text-sm leading-6 text-emerald-800">
                Your 7-day free trial is active. Follow the steps below to get started — read your first note, take a quiz, and ask Scholar anything.
              </p>
            </div>
          </div>
        )}
        <TrialBanner email={user.email} />
        <OnboardingChecklist userId={user.id} email={user.email} />
        <UserDashboardClient initialData={initialData} levelStates={levelStates} />
      </div>
    </main>
  );
}