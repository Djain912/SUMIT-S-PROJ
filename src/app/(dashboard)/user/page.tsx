import { UserDashboardClient } from '@/components/user/user-dashboard';

export default function UserDashboardPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <UserDashboardClient />
      </div>
    </main>
  );
}