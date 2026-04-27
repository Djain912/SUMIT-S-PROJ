export default function UserLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="h-5 w-32 rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-56 rounded bg-zinc-100" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="h-4 w-24 rounded bg-zinc-200" />
              <div className="mt-3 h-8 w-16 rounded bg-zinc-100" />
            </div>
          ))}
        </div>

        <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-10 rounded bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
