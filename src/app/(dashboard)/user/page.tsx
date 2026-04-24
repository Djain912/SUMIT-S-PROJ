import { UserDashboardClient } from '@/components/user/user-dashboard';

export default function UserDashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <UserDashboardClient />
      </div>
    </main>
  );
}