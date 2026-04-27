import { UserAnalyticsClient } from '@/components/user/user-analytics-client';

export default function UserAnalyticsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <UserAnalyticsClient />
      </div>
    </main>
  );
}