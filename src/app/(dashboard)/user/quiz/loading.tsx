import { QuizSkeleton } from '@/components/shared/skeleton';

export default function QuizLoading() {
  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200" />
        </div>
        <QuizSkeleton />
      </div>
    </main>
  );
}
