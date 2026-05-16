import Link from 'next/link';
import { ArrowRight, BookOpen, Target, TrendingUp, Users, Shield, Zap } from 'lucide-react';

export const metadata = {
  title: 'About — CMT Prep',
  description: 'Learn about CMT Prep — purpose-built exam preparation for CMT candidates.',
};

const values = [
  {
    icon: Target,
    title: 'Exam-focused',
    description: 'Every piece of content is mapped to the CMT Association syllabus. No filler, no fluff.',
  },
  {
    icon: TrendingUp,
    title: 'Data-driven',
    description: 'Analytics that surface exactly where you need work so you can study smarter, not longer.',
  },
  {
    icon: Zap,
    title: 'Built for speed',
    description: 'A clean, fast interface that gets out of your way so you can focus on learning.',
  },
  {
    icon: Shield,
    title: 'Trusted content',
    description: 'Questions and notes reviewed for accuracy and alignment with the real exam format.',
  },
];

const levels = [
  {
    level: 'CMT Level I',
    description: 'Foundational concepts in technical analysis — theory, history, and core charting principles.',
    chapters: 12,
    questions: '70+',
  },
  {
    level: 'CMT Level II',
    description: 'Advanced analysis, intermarket analysis, trading systems, and risk management.',
    chapters: 12,
    questions: '70+',
  },
  {
    level: 'CMT Level III',
    description: 'Portfolio management, behavioral finance, and integration of technical methods.',
    chapters: 12,
    questions: '70+',
  },
];

export default function AboutPage() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-50 opacity-60 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                About CMT Prep
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                Built by analysts,{' '}
                <span className="text-indigo-600">for analysts</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-500">
                CMT Prep started with a simple observation: most exam prep resources are generic. We built the tool we wished we had — laser-focused on the CMT exams and designed to get you to passing faster.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-y border-zinc-100 bg-zinc-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Our mission</h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  The Chartered Market Technician designation is one of the most respected credentials in technical analysis. We exist to make preparing for it more accessible, efficient, and effective for individual candidates worldwide.
                </p>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  We believe that with the right tools, anyone with dedication can pass the CMT exams — and we&apos;re building those tools.
                </p>
                <div className="mt-8">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
                    Start studying free <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '3', label: 'Exam levels covered' },
                  { value: '200+', label: 'Practice questions' },
                  { value: '46', label: 'Structured subtopics' },
                  { value: '500+', label: 'Active candidates' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                    <p className="text-3xl font-bold text-zinc-950">{stat.value}</p>
                    <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">What we stand for</h2>
              <p className="mt-4 text-base leading-7 text-zinc-500">
                Four principles that guide everything we build.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="rounded-2xl border border-zinc-100 p-6 shadow-sm">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-zinc-950">{v.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{v.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Coverage */}
        <section className="bg-zinc-50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Full CMT coverage</h2>
              <p className="mt-4 text-base leading-7 text-zinc-500">
                Content for all three levels, organized to match the actual exam structure.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {levels.map((l, i) => (
                <div key={l.level} className="relative rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: i === 0 ? '#e0e7ff' : '#e4e4e7' }}>
                  {i === 0 && (
                    <span className="absolute right-4 top-4 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      Available now
                    </span>
                  )}
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-950">{l.level}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{l.description}</p>
                  <div className="mt-4 flex gap-4 text-xs text-zinc-400">
                    <span>{l.chapters} chapters</span>
                    <span>{l.questions} questions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Who we are</h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  We&apos;re a small, focused team with backgrounds in technical analysis, finance education, and software engineering. We built CMT Prep because we saw a gap — and we&apos;re committed to filling it.
                </p>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  Every feature we ship is driven by one question: does this help a candidate study more effectively and pass the exam?
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <blockquote className="mt-6">
                  <p className="text-base leading-7 text-zinc-700">
                    &ldquo;We spent months preparing for the CMT exam using fragmented resources — textbooks, random websites, flashcard apps. CMT Prep is what we wished existed from day one.&rdquo;
                  </p>
                  <footer className="mt-4">
                    <p className="text-sm font-semibold text-zinc-900">The CMT Prep team</p>
                    <p className="text-sm text-zinc-500">Founders & CMT charterholders</p>
                  </footer>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-indigo-600 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start your CMT journey today
            </h2>
            <p className="mt-4 text-base leading-7 text-indigo-200">
              Create a free account and explore CMT Level I content — no commitment required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-full border border-indigo-400 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} CMT Prep. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-950">Home</Link>
              <Link href="/about" className="text-xs text-zinc-400 hover:text-zinc-950">About</Link>
              <Link href="/sign-in" className="text-xs text-zinc-400 hover:text-zinc-950">Sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
