import { UserNotesClient } from '@/components/user/user-notes';
import { Sparkles } from 'lucide-react';

export const metadata = { title: 'Notes' };

export default async function UserNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {welcome === '1' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Welcome to Chartix! We&apos;ve opened your first chapter.</p>
              <p className="mt-0.5 text-sm leading-6 text-emerald-800">
                Read for 10 minutes, then try your first quiz — that&apos;s the whole first step. Your 7-day free trial is running, so dive right in.
              </p>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Notes</h1>
        </div>
        <UserNotesClient />
      </div>
    </main>
  );
}
