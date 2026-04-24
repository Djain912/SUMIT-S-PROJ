import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Finance Exam Platform
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Study by level, chapter, and focused practice.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Learners get a clean dashboard for notes, topic-wise revision, and quiz practice. Admin access is separate and reserved for the single platform owner.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {['Level-wise curriculum', 'Notes by subtopic', 'Targeted quizzes', 'Progress dashboard'].map((item) => (
              <div key={item} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm font-medium text-zinc-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">{children}</section>
      </div>
    </main>
  );
}
