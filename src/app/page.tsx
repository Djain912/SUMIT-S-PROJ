import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen, ListChecks, BarChart2, ArrowRight,
  TrendingUp, ChevronRight, Brain, FlaskConical,
} from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { siteConfig } from '@/lib/site';
import { HomepageChatWidget } from '@/components/public/HomepageChatWidget';

export const metadata: Metadata = {
  title: 'Chartix CMT Exam Prep | Technical Analysis Notes, Quizzes & Analytics',
  description:
    'Prepare for the CMT exam with Chartix: technical analysis study notes, CMT Level I, II and III practice quizzes, chapter-wise revision, and performance analytics.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Chartix CMT Exam Prep',
    description: 'Technical analysis notes, CMT practice quizzes, and exam analytics for serious market analysis candidates.',
    url: '/',
  },
};

const pillars = [
  {
    icon: BookOpen,
    title: 'Chapter Notes',
    description: 'Structured, exam-mapped notes for every CMT chapter across all three levels.',
  },
  {
    icon: ListChecks,
    title: '2000+ Practice MCQs',
    description: 'Questions written at real exam difficulty. Unlimited mock tests, customised by topic.',
  },
  {
    icon: BarChart2,
    title: 'Deep Analytics',
    description: 'See exactly where you are strong and where you need work — chapter by chapter.',
  },
  {
    icon: Brain,
    title: 'Chartix Scholar',
    description: 'Ask Chartix Scholar anything — it is trained on the CMT curriculum and explains concepts, answers exam questions, and keeps you on track.',
  },
];

const steps = [
  { step: '01', title: 'Create your free account', description: 'Sign up in seconds — no credit card required.' },
  { step: '02', title: 'Choose your CMT level', description: 'Pick Level I, II, or III and get instant access to your curriculum.' },
  { step: '03', title: 'Study, practise & pass', description: 'Work through notes, take quizzes, track your progress, repeat.' },
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

      <div className="min-h-screen bg-white">

        {/* ── NAVBAR ── */}
        <nav className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-emerald-900">Chartix</span>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              {[
                { label: 'Home', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-zinc-500 hover:text-emerald-700 transition">
                  {link.label}
                </Link>
              ))}
              <Link href="/tools" className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                <FlaskConical className="h-3 w-3" /> Free Tools
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <Link href={isAdmin ? '/admin' : '/user'} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  {isAdmin ? 'Admin Console' : 'Dashboard'}
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="hidden text-sm font-medium text-zinc-500 hover:text-emerald-700 transition sm:block">
                    Log In
                  </Link>
                  <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                    Enroll Now <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main>
          {/* ── HERO ── */}
          {!isLoggedIn ? (
            <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
              <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />

              <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2">

                  {/* Left – copy */}
                  <div>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                      CMT Exam Prep Platform
                    </span>

                    <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-emerald-900 sm:text-5xl lg:text-[3.2rem]">
                      Pass your CMT exam.<br />
                      <span className="text-emerald-500">Study smarter.</span>
                    </h1>

                    <p className="mt-4 text-base leading-7 text-zinc-500 max-w-md">
                      Chapter-by-chapter notes, 2000+ practice MCQs, unlimited mock tests, and the Chartix Scholar — everything you need for Level I, II, and III.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700">
                        Start free <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 px-7 py-3.5 text-sm font-bold text-emerald-700 transition hover:border-emerald-400">
                        View pricing
                      </Link>
                    </div>
                    <p className="mt-3 text-xs text-zinc-400">Free trial available · No credit card required</p>
                  </div>

                  {/* Right – browser mockup */}
                  <div className="relative">
                    {/* "Now Live!" badge */}
                    <div className="absolute -top-4 right-2 z-20 lg:-right-2">
                      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-emerald-200 bg-emerald-50 shadow-lg">
                        <span className="text-[9px] font-black uppercase text-emerald-700">Now</span>
                        <span className="text-[9px] font-black uppercase text-emerald-700">Live!</span>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
                      {/* Browser chrome */}
                      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1 font-mono text-[10px] text-gray-400">
                          chartix.in/user
                        </div>
                      </div>

                      {/* Fake dashboard */}
                      <div className="flex h-72 sm:h-80 bg-slate-50">
                        {/* Sidebar */}
                        <div className="hidden w-36 shrink-0 border-r border-gray-100 bg-white p-3 sm:flex sm:flex-col">
                          <div className="mb-3 flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600">
                              <TrendingUp className="h-2.5 w-2.5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-900">Chartix</span>
                          </div>
                          {['Dashboard', 'Notes', 'Quizzes', 'Analytics', 'Scholar'].map((item, i) => (
                            <div key={item} className={`mb-1 rounded-lg px-2 py-1.5 text-[9px] font-medium ${i === 0 ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}>
                              {item}
                            </div>
                          ))}
                          <div className="mt-auto rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                            <div className="text-[8px] font-semibold text-emerald-800">CMT Level 2</div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-emerald-100">
                              <div className="h-1.5 w-2/3 rounded-full bg-emerald-500" />
                            </div>
                            <div className="mt-0.5 text-[7px] text-emerald-600">67% complete</div>
                          </div>
                        </div>

                        {/* Main area */}
                        <div className="flex-1 overflow-hidden p-4">
                          <div className="mb-3 text-[11px] font-semibold text-zinc-600">Chapter 4 — Trend Analysis</div>
                          <div className="mb-3 grid grid-cols-3 gap-2">
                            {[
                              { label: 'Accuracy', value: '78%', color: 'text-emerald-600' },
                              { label: 'Streak', value: '12d', color: 'text-orange-500' },
                              { label: 'Rank', value: '#42', color: 'text-violet-500' },
                            ].map((s) => (
                              <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-2 text-center shadow-sm">
                                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-[8px] text-zinc-400">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                            <div className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-emerald-600">Practice Question · Medium</div>
                            <div className="text-[10px] leading-4 text-zinc-700">
                              Which of the following best describes a &apos;head and shoulders&apos; pattern in technical analysis?
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {['A reversal pattern indicating...', 'A continuation pattern showing...', 'A pattern formed by three peaks...'].map((opt, i) => (
                                <div key={i} className={`rounded-lg border px-2 py-1 text-[9px] ${i === 2 ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-gray-100 text-zinc-400'}`}>
                                  {String.fromCharCode(65 + i)}. {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* ── LOGGED-IN HERO ── */
            <section className="bg-gradient-to-b from-emerald-50 to-white py-16 px-4">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-emerald-900 sm:text-5xl">
                  {user?.name ? `Hey, ${user.name.split(' ')[0]} 👋` : 'Welcome back'}
                </h1>
                <p className="mt-4 text-base text-zinc-500">
                  {isAdmin ? 'Manage content, review reports, and keep the platform running.' : 'Your notes, quizzes, and analytics are ready.'}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {isAdmin ? (
                    <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                      Admin Console <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <>
                      <Link href="/user" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                        Continue Studying <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href="/user/quiz" className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 px-7 py-3.5 text-sm font-bold text-emerald-700 transition hover:border-emerald-400">
                        Start a Quiz
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── STATS STRIP ── */}
          {!isAdmin && (
            <section className="bg-emerald-800 py-9">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <dl className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                  {[
                    { value: '3', label: 'CMT Levels' },
                    { value: '2000+', label: 'Practice MCQs' },
                    { value: '∞', label: 'Mock Tests' },
                    { value: '6 Months', label: 'Access Per Level' },
                  ].map((s) => (
                    <div key={s.label}>
                      <dt className="text-2xl font-extrabold text-white sm:text-3xl">{s.value}</dt>
                      <dd className="mt-1 text-xs font-medium text-emerald-300 sm:text-sm">{s.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* ── INDICATOR LAB ── */}
          {!isAdmin && (
            <section className="bg-white py-20 sm:py-24 border-t border-zinc-100">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    <FlaskConical className="h-3 w-3" /> 100% Free · No Login Required
                  </span>
                </div>
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
                    Chartix Indicator Lab
                  </h2>
                  <p className="mt-3 text-base text-zinc-500 max-w-2xl mx-auto">
                    Build every major technical indicator yourself — live chart, step-by-step calculation table, and a clear explanation. The best way to truly understand how each indicator works.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: 'rsi',         name: 'RSI',                  desc: 'Momentum on a 0–100 scale',          color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                    { key: 'macd',        name: 'MACD',                 desc: 'Gap between fast & slow EMA',         color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                    { key: 'stochastics', name: 'Stochastics',          desc: 'Close vs n-bar high-low range',       color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                    { key: 'roc',         name: 'Rate of Change',       desc: '% price move vs n bars ago',          color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                    { key: 'obv',         name: 'On Balance Volume',    desc: 'Granville\'s volume running total',    color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
                    { key: 'adl',         name: 'Accum/Distribution',   desc: 'Chaikin\'s volume multiplier line',    color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
                    { key: 'cmf',         name: 'Chaikin Money Flow',   desc: 'Windowed money flow ratio',           color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
                    { key: 'mfi',         name: 'Money Flow Index',     desc: 'Volume-weighted RSI (0–100)',         color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
                    { key: 'dmi',         name: 'DMI / ADX',            desc: 'Trend direction + strength (Wilder)', color: 'bg-amber-50 border-amber-100 hover:border-amber-300' },
                    { key: 'ppo',         name: 'PPO',                  desc: 'MACD as a % — normalized',            color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                    { key: 'rvol',        name: 'Relative Volume',      desc: 'Today\'s vol ÷ average vol',           color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
                    { key: 'bb',          name: 'Bollinger Bands®',      desc: 'SMA ± 2σ volatility bands',           color: 'bg-rose-50 border-rose-100 hover:border-rose-300' },
                  ].map((t) => (
                    <Link key={t.key} href={`/tools/${t.key}`}
                      className={`group rounded-xl border p-4 transition ${t.color}`}>
                      <p className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800">{t.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{t.desc}</p>
                      <p className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5">
                        Open <ChevronRight className="h-3 w-3" />
                      </p>
                    </Link>
                  ))}
                  {/* View all card */}
                  <Link href="/tools"
                    className="group flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-600 p-4 transition hover:bg-emerald-700 text-center">
                    <p className="text-sm font-bold text-white">View All 17 Tools</p>
                    <p className="mt-1 text-xs text-emerald-200">+ filter by category</p>
                    <ArrowRight className="mt-2 h-4 w-4 text-white" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── 4 PILLARS ── */}
          {!isAdmin && (
            <section className="bg-white py-20 sm:py-24">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">Everything you need to pass</h2>
                  <p className="mt-3 text-base text-zinc-500">One platform. All three levels. Built for the CMT exam.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {pillars.map((p) => {
                    const Icon = p.icon;
                    return (
                      <div key={p.title} className="group rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="mt-4 text-sm font-bold text-emerald-900">{p.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{p.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ── HOW IT WORKS ── */}
          {!isLoggedIn && (
            <section className="border-t border-emerald-100 bg-emerald-50 py-20 sm:py-24">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">Get started in 3 steps</h2>
                </div>
                <div className="grid gap-8 sm:grid-cols-3">
                  {steps.map((s, i) => (
                    <div key={s.step} className="relative text-center sm:text-left">
                      {i < steps.length - 1 && (
                        <div className="absolute top-5 left-full hidden h-px w-full -translate-x-4 bg-emerald-200 sm:block" />
                      )}
                      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white sm:mx-0">
                        {s.step}
                      </div>
                      <h3 className="mt-4 text-base font-bold text-emerald-900">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-zinc-500">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── DARK CTA ── */}
          {!isLoggedIn && (
            <section className="bg-emerald-900 py-16 sm:py-20">
              <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to start?
                </h2>
                <p className="mt-4 text-emerald-300 text-base">
                  Free trial available. No credit card needed. Pick your level and begin today.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50">
                    Create free account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-600 px-8 py-3.5 text-sm font-bold text-emerald-200 transition hover:border-emerald-400 hover:text-white">
                    See pricing <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── ADMIN QUICK ACCESS ── */}
          {isAdmin && (
            <section className="bg-white py-12">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Quick access</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Notes', href: '/admin/notes' },
                    { label: 'Questions', href: '/admin/questions' },
                    { label: 'Blog', href: '/admin/blog' },
                  ].map((item) => (
                    <Link key={item.label} href={item.href} className="group flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 transition hover:border-emerald-300">
                      <span className="text-sm font-semibold text-emerald-900">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-emerald-300 transition group-hover:text-emerald-700" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* ── FOOTER ── */}
        <footer className="border-t border-emerald-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-emerald-900">Chartix</span>
                </div>
                <p className="mt-3 text-xs leading-6 text-zinc-400">
                  Purpose-built CMT exam prep for Level I, II, and III candidates. Not affiliated with the CMT Association.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-4">Platform</p>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Home', href: '/' },
                    { label: 'Blog', href: '/blog' },
                    { label: 'Pricing', href: '/pricing' },
                    { label: 'About', href: '/about' },
                    { label: 'Contact', href: '/contact' },
                  ].map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-zinc-400 hover:text-emerald-700 transition">{l.label}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-4">Study</p>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Dashboard', href: '/user' },
                    { label: 'Quiz', href: '/user/quiz' },
                    { label: 'Analytics', href: '/user/analytics' },
                    { label: 'Free Indicator Lab', href: '/tools' },
                    { label: 'Sign In', href: '/sign-in' },
                    { label: 'Get Started', href: '/sign-up' },
                  ].map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-zinc-400 hover:text-emerald-700 transition">{l.label}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-4">Legal</p>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Privacy Policy', href: '/privacy-policy' },
                    { label: 'Terms & Conditions', href: '/terms' },
                    { label: 'Refund Policy', href: '/refund-policy' },
                    { label: 'Disclaimer', href: '/disclaimer' },
                  ].map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-zinc-400 hover:text-emerald-700 transition">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-emerald-50 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
              <div className="flex gap-5">
                <Link href="/privacy-policy" className="text-xs text-zinc-400 hover:text-emerald-700 transition">Privacy</Link>
                <Link href="/terms" className="text-xs text-zinc-400 hover:text-emerald-700 transition">Terms</Link>
                <Link href="/refund-policy" className="text-xs text-zinc-400 hover:text-emerald-700 transition">Refund Policy</Link>
              </div>
            </div>
          </div>
        </footer>

        <HomepageChatWidget />
      </div>
    </>
  );
}
