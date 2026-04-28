export default function AdminChaptersLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="h-5 w-56 max-w-full animate-pulse rounded bg-zinc-200" />
              <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
