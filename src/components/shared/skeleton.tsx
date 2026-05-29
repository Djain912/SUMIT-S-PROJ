import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Level card */}
      <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-12" />
        </div>
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="flex gap-4">
              <div className="px-3 text-center">
                <Skeleton className="mx-auto h-6 w-10" />
                <Skeleton className="mx-auto mt-1 h-3 w-8" />
              </div>
              <div className="px-3 text-center">
                <Skeleton className="mx-auto h-6 w-10" />
                <Skeleton className="mx-auto mt-1 h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter cards */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-100 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y divide-zinc-50">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between p-4">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-14 rounded-lg" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Level bars + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm space-y-5">
          <Skeleton className="h-4 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm space-y-4">
          <Skeleton className="h-4 w-20" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between border-b border-zinc-50 pb-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-zinc-100 px-6 py-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-none" />
          ))}
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                {[1, 2].map((j) => (
                  <div key={j} className="flex justify-between rounded-lg bg-white px-3 py-2">
                    <Skeleton className="h-3 w-40" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-10 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotesSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
      <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuizSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}
