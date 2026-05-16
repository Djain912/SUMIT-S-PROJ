import { NotesSkeleton } from '@/components/shared/skeleton';

export default function NotesLoading() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 space-y-1">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="h-7 w-40 animate-pulse rounded-lg bg-zinc-200" />
        </div>
        <NotesSkeleton />
      </div>
    </main>
  );
}
