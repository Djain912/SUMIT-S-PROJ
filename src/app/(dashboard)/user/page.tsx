import { requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserDashboardData } from '@/server/services/dashboard.service';
import { UserDashboardClient } from '@/components/user/user-dashboard';

export default async function UserDashboardPage() {
  const user = await requireAuthenticatedUser();
  const initialData = await getUserDashboardData(user.id, 'LEVEL_1');

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <UserDashboardClient initialData={initialData} />
      </div>
    </main>
  );
}