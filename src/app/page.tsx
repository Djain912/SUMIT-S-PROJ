import Link from 'next/link';
import { BookOpen, ListChecks, FileText } from 'lucide-react';

const features = [
  { label: 'Chapters', description: 'Organized study content', icon: BookOpen },
  { label: 'Quizzes', description: 'Practice with instant feedback', icon: ListChecks },
  { label: 'Notes', description: 'Study materials for each topic', icon: FileText },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl lg:text-[2.7rem]">
            Study Platform
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
            Sign in to access your study materials and practice quizzes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <Icon className="h-5 w-5 text-zinc-600" />
                <p className="mt-3 text-sm font-semibold text-zinc-950 sm:text-base">{feature.label}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}