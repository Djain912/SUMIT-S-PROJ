import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen, ListChecks, BarChart2, ArrowRight, CheckCircle,
  TrendingUp, Users, Award, ChevronRight,
} from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Chartix CMT Exam Prep | Technical Analysis Notes, Quizzes & Analytics',
  description:
    'Prepare for the CMT exam with Chartix: technical analysis study notes, CMT Level I, II and III practice quizzes, chapter-wise revision, and performance analytics.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Chartix CMT Exam Prep',
    description:
      'Technical analysis notes, CMT practice quizzes, and exam analytics for serious market analysis candidates.',
    url: '/',
  },
};

const features = [
  {
    icon: BookOpen,
    title: 'Structured Curriculum',
    description: 'All three CMT levels with chapters, subtopics, and detailed notes organized for maximum retention.',
  },
  {
    icon: ListChecks,
    title: 'Adaptive Quizzes',
    description: 'Practice by chapter, subtopic, or full test mode. Get instant feedback on every answer.',
  },
  {
    icon: BarChart2,
    title: 'Deep Analytics',
    description: 'Track accuracy, identify weak areas, and see your improvement over time with detailed insights.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Chapter-by-chapter progress with streaks and performance scores to keep you on track.',
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

const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      inLanguage: 'en',
      publisher: { '@id': `${siteConfig.url}/#organization` },
    },
    {
      '@type': 'WebApplication',
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description: siteConfig.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
};

export default async function HomePage() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;
  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <main className="min-h-screen bg-white">

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-zinc-100">
          {/* Subtle noise/grid bg */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,0,0,0.04),transparent)]" />

          <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24 lg:px-8">
            {isLoggedIn ? (
              <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Welcome back
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl font-heading">
                  {user?.name ? `Hey, ${user.name.split(' ')[0]}` : 'Good to see you'}
                </h1>
                <p className="mt-5 text-lg leading-8 text-zinc-500">
                  {isAdmin
                    ? 'Manage content, review reports, and keep the platform running smoothly.'
                    : 'Pick up where you left off — your chapters, quizzes, and analytics are ready.'}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {isAdmin ? (
                    <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700">
                      Admin Console <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <>
                      <Link href="/user" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700">
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
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Chartix CMT Exam Prep
                </span>
                <h1 className="mt-6 text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl font-heading">
                  Pass your CMT{' '}
                  <span className="relative">
                    <span className="relative z-10">exam.</span>
                    <span className="absolute bottom-1 left-0 right-0 h-3 bg-zinc-100 -z-0 rounded" />
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-zinc-500 sm:text-xl">
                  Structured technical analysis notes, adaptive CMT practice quizzes, and deep analytics for CMT Level I, II, and III candidates.
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                    Sign in
                  </Link>
                </div>
                <p className="mt-4 text-xs text-zinc-400">No credit card required. Cancel anytime.</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats bar */}
        {!isAdmin && (
          <section className="border-b border-zinc-100 bg-zinc-50">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <dt className="text-3xl font-bold text-zinc-950 font-heading">{stat.value}</dt>
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
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">
                  Everything you need to pass
                </h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  Built specifically for CMT candidates who want a structured, efficient path to passing.
                </p>
              </div>
              <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-zinc-300">
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800'}`}>
                        <Icon className="h-5 w-5 text-white" />
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
          <section className="border-y border-zinc-100 bg-zinc-50 py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">
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
                      <div className="absolute top-5 left-full hidden h-px w-full -translate-x-4 bg-zinc-300 sm:block" />
                    )}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white font-heading">
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

        {/* Why Chartix */}
        {!isLoggedIn && (
          <section className="bg-white py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">
                    Designed for serious candidates
                  </h2>
                  <p className="mt-4 text-base leading-7 text-zinc-500">
                    The CMT exams are rigorous. Generic study tools don&apos;t cut it. Chartix is built from the ground up for the specific technical analysis content, question style, and pacing of CMT Level I, II, and III.
                  </p>
                  <ul className="mt-8 space-y-4">
                    {[
                      'Curriculum mapped directly to the CMT Association syllabus',
                      'Questions written in the same style as the real exam',
                      'Analytics that tell you exactly where to focus',
                      'Study at your own pace — no fixed schedule',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm text-zinc-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Questions answered', value: '10,000+', icon: ListChecks },
                    { label: 'Score improvement', value: '+23%', icon: TrendingUp },
                    { label: 'Active candidates', value: '500+', icon: Users },
                    { label: 'Pass rate', value: '82%', icon: Award },
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-700'}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <p className="mt-3 text-2xl font-bold text-zinc-950 font-heading">{card.value}</p>
                        <p className="mt-1 text-xs text-zinc-500">{card.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        {!isLoggedIn && (
          <section className="bg-zinc-950 py-16 sm:py-20">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-heading">
                Ready to start studying?
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                Join CMT candidates who use Chartix to study technical analysis, practice chapter-wise questions, and prepare smarter.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800">
                  Learn more <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Admin quick access */}
        {isAdmin && (
          <section className="bg-white py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Quick access</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Chapters', description: 'Manage study content', href: '/admin/chapters' },
                  { label: 'Questions', description: 'Add and edit questions', href: '/admin/questions' },
                  { label: 'Notes', description: 'Manage study notes', href: '/admin/notes' },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-zinc-400 hover:bg-zinc-100">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:text-zinc-900" />
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
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-zinc-950 font-heading">Chartix</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-zinc-500">
                Purpose-built CMT exam preparation and technical analysis practice for Level I, II, and III candidates.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Platform</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'About', href: '/about' },
                  { label: 'Contact Us', href: '/contact' },
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
                  { label: 'Dashboard', href: '/user' },
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
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
            <p className="text-xs text-zinc-400">Built for CMT Association exam candidates</p>
          </div>
        </div>
      </footer>
    </>
  );
}
