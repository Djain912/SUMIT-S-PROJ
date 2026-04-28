export default function AdminSubtopicsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-8 w-52 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="h-5 w-44 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, chapterIndex) => (
            <div key={chapterIndex} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="h-5 w-48 animate-pulse rounded bg-zinc-200" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 2 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="h-12 animate-pulse rounded bg-zinc-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
