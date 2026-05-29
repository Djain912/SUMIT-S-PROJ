import { UserNotesClient } from '@/components/user/user-notes';

export const metadata = { title: 'Notes' };

export default function UserNotesPage() {
  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Notes</h1>
        </div>
        <UserNotesClient />
      </div>
    </main>
  );
}
