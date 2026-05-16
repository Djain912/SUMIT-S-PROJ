import Link from 'next/link';
import { BookOpen, ListChecks, FileText, BarChart2, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth/auth';

const features = [
  { label: 'Chapters', description: 'Structured study content across all CMT levels', icon: BookOpen, href: '/user' },
  { label: 'Quizzes', description: 'Practice questions with instant feedback', icon: ListChecks, href: '/user/quiz' },
  { label: 'Notes', description: 'Detailed notes for every topic', icon: FileText, href: '/user' },
  { label: 'Analytics', description: 'Track your progress and weak areas', icon: BarChart2, href: '/user/analytics' },
];

export default async function HomePage() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Hero */}
        <div className="mb-12 max-w-2xl">
          {isLoggedIn ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                Welcome back
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                {user?.name ? `Hey, ${user.name.split(' ')[0]}` : 'Good to see you'}
              </h1>
              <p className="mt-3 text-base leading-7 text-zinc-500">
                {isAdmin
                  ? 'Manage your platform from the admin console.'
                  : 'Pick up where you left off — your chapters, quizzes, and analytics are ready.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Go to Admin Console <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/user"
                      className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Continue Studying <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/user/quiz"
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Start a Quiz
                    </Link>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                Finance Prep Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl lg:text-[2.6rem]">
                Ace your CMT exams
              </h1>
              <p className="mt-3 text-base leading-7 text-zinc-500">
                Structured chapters, practice quizzes, and detailed analytics — everything you need to pass.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Sign in <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Create account
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Feature cards — only show for logged-in regular users and guests */}
        {!isAdmin && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.label}
                  href={isLoggedIn ? feature.href : '/sign-in'}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                >
                  <Icon className="h-5 w-5 text-zinc-500 transition group-hover:text-zinc-950" />
                  <p className="mt-3 text-sm font-semibold text-zinc-950">{feature.label}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{feature.description}</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Admin card */}
        {isAdmin && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Chapters', description: 'Manage study content', href: '/admin/chapters' },
              { label: 'Questions', description: 'Add and edit questions', href: '/admin/questions' },
              { label: 'Notes', description: 'Manage study notes', href: '/admin/notes' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
