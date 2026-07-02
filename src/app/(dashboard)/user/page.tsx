import Link from 'next/link';
import { MessageSquareHeart } from 'lucide-react';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserDashboardData } from '@/server/services/dashboard.service';
import { UserDashboardClient } from '@/components/user/user-dashboard';
import { TrialBanner } from '@/components/user/TrialBanner';
import { OnboardingChecklist } from '@/components/user/OnboardingChecklist';

export default async function UserDashboardPage() {
  const user = await requireAuthenticatedUser();
  const initialData = await getUserDashboardData(user.id, user.email, 'LEVEL_1');

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
        <TrialBanner email={user.email} />
        <OnboardingChecklist userId={user.id} email={user.email} />
        <UserDashboardClient initialData={initialData} />
      </div>
    </main>
  );
}