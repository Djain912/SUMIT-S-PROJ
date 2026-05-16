import Link from 'next/link';
import { BookOpen, ListChecks, BarChart2, ArrowRight, CheckCircle, TrendingUp, Users, Award, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth/auth';

const features = [
  {
    icon: BookOpen,
    title: 'Structured Curriculum',
    description: 'All three CMT levels with chapters, subtopics, and detailed notes organized for maximum retention.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: ListChecks,
    title: 'Adaptive Quizzes',
    description: 'Practice by chapter, subtopic, or full test mode. Get instant feedback on every answer.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: BarChart2,
    title: 'Deep Analytics',
    description: 'Track accuracy, identify weak areas, and see your improvement over time with detailed insights.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Chapter-by-chapter progress with streaks and performance scores to keep you on track.',
    color: 'bg-amber-50 text-amber-600',
  },
];

const steps = [
  { step: '01', title: 'Create your account', description: 'Sign up in seconds — no credit card required.' },
  { step: '02', title: 'Choose your level', description: 'Select CMT Level I, II, or III and start from where you are.' },
  { step: '03', title: 'Study & practice', description: 'Work through notes, take quizzes, and review your analytics.' },
];

const stats = [
  { value: '3', label: 'CMT Levels covered' },
  { value: '200+', label: 'Practice questions' },
  { value: '46', label: 'Structured subtopics' },
  { value: '12', label: 'Chapters per level' },
];

export default async function HomePage() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -right-32 h-[600px] w-[600px] rounded-full bg-indigo-50 opacity-60 blur-3xl" />
            <div className="absolute -bottom-20 -left-32 h-[400px] w-[400px] rounded-full bg-violet-50 opacity-50 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8">
            {isLoggedIn ? (
              <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                  Welcome back
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : 'Good to see you'}
                </h1>
                <p className="mt-5 text-lg leading-8 text-zinc-500">
                  {isAdmin
                    ? 'Manage content, review reports, and keep the platform running smoothly.'
                    : 'Pick up where you left off — your chapters, quizzes, and analytics are ready.'}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {isAdmin ? (
                    <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                      Admin Console <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <>
                      <Link href="/user" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                        Continue Studying <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href="/user/quiz" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50">
                        Start a Quiz
                      </Link>
                      <Link href="/user/analytics" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50">
                        View Analytics
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                  CMT Exam Preparation
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
                  Pass your CMT exam{' '}
                  <span className="text-indigo-600">on the first try</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-zinc-500 sm:text-xl">
                  Structured study notes, adaptive practice quizzes, and deep analytics — purpose-built for CMT Level I, II, and III candidates.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                    Sign in
                  </Link>
                </div>
                <p className="mt-4 text-xs text-zinc-400">No credit card required · Cancel anytime</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats bar */}
        {!isAdmin && (
          <section className="border-y border-zinc-100 bg-zinc-50">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <dt className="text-3xl font-bold text-zinc-950">{stat.value}</dt>
                    <dd className="mt-1 text-sm text-zinc-500">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* Features */}
        {!isAdmin && (
          <section className="bg-white py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  Everything you need to pass
                </h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  Built specifically for CMT candidates who want a structured, efficient path to passing.
                </p>
              </div>
              <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="group rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm transition hover:border-zinc-200 hover:shadow-md">
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-zinc-950">{f.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">{f.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        {!isLoggedIn && (
          <section className="bg-zinc-50 py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  How it works
                </h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  Get from sign-up to exam-ready in three simple steps.
                </p>
              </div>
              <div className="mt-14 grid gap-8 sm:grid-cols-3">
                {steps.map((s, i) => (
                  <div key={s.step} className="relative">
                    {i < steps.length - 1 && (
                      <div className="absolute top-5 left-full hidden h-px w-full -translate-x-4 bg-zinc-200 sm:block" />
                    )}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {s.step}
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-zinc-950">{s.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why CMT Prep — logged out only */}
        {!isLoggedIn && (
          <section className="bg-white py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                    Designed for serious candidates
                  </h2>
                  <p className="mt-4 text-base leading-7 text-zinc-500">
                    The CMT exams are rigorous. Generic study tools don&apos;t cut it. CMT Prep is built from the ground up for the specific content, question style, and pacing of CMT Level I, II, and III.
                  </p>
                  <ul className="mt-8 space-y-4">
                    {[
                      'Curriculum mapped directly to the CMT Association syllabus',
                      'Questions written in the same style as the real exam',
                      'Analytics that tell you exactly where to focus',
                      'Study at your own pace — no fixed schedule',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                        <span className="text-sm text-zinc-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Questions answered', value: '10,000+', icon: ListChecks, color: 'bg-indigo-50 text-indigo-600' },
                    { label: 'Average score improvement', value: '+23%', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Active candidates', value: '500+', icon: Users, color: 'bg-violet-50 text-violet-600' },
                    { label: 'Pass rate', value: '82%', icon: Award, color: 'bg-amber-50 text-amber-600' },
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="mt-3 text-2xl font-bold text-zinc-950">{card.value}</p>
                        <p className="mt-1 text-xs text-zinc-500">{card.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA — logged out only */}
        {!isLoggedIn && (
          <section className="bg-indigo-600 py-16 sm:py-20">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to start studying?
              </h2>
              <p className="mt-4 text-base leading-7 text-indigo-200">
                Join hundreds of CMT candidates who are already using CMT Prep to prepare smarter.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-indigo-400 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500">
                  Learn more <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Logged-in quick nav for admin */}
        {isAdmin && (
          <section className="bg-white py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Quick access</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Chapters', description: 'Manage study content', href: '/admin/chapters' },
                  { label: 'Questions', description: 'Add and edit questions', href: '/admin/questions' },
                  { label: 'Notes', description: 'Manage study notes', href: '/admin/notes' },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="group flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-5 transition hover:border-indigo-200 hover:bg-indigo-50">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:text-indigo-600" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-zinc-950">CMT Prep</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-zinc-500">
                Purpose-built exam preparation for CMT Level I, II, and III candidates.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Platform</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'About', href: '/about' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-500 transition hover:text-zinc-950">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Study</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: 'Chapters', href: '/user' },
                  { label: 'Quiz', href: '/user/quiz' },
                  { label: 'Analytics', href: '/user/analytics' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-500 transition hover:text-zinc-950">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Account</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: 'Sign in', href: '/sign-in' },
                  { label: 'Create account', href: '/sign-up' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-500 transition hover:text-zinc-950">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-zinc-100 pt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} CMT Prep. All rights reserved.</p>
            <p className="text-xs text-zinc-400">Built for CMT Association exam candidates</p>
          </div>
        </div>
      </footer>
    </>
  );
}
