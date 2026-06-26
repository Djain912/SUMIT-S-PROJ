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
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study Hub</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Dashboard</h1>
        </div>
        <TrialBanner email={user.email} />
        <OnboardingChecklist userId={user.id} email={user.email} />
        <UserDashboardClient initialData={initialData} />
      </div>
    </main>
  );
}