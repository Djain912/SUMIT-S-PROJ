import { requireAuthenticatedUser } from '@/server/policies/auth';
import { UserSummaryClient } from '@/components/user/user-summary-client';

export const metadata = { title: 'Key Takeaways' };

export default async function UserSummaryPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Key Takeaways</h1>
          <p className="mt-1 text-sm text-zinc-500">Chapter summaries, exam tips, and important formulas — all in one place.</p>
        </div>
        <UserSummaryClient userEmail={user.email} />
      </div>
    </main>
  );
}
