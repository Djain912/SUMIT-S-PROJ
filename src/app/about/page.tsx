import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Target, TrendingUp, Shield, Zap, Linkedin, Mail, Brain, Instagram, Twitter } from 'lucide-react';
import { siteConfig } from '@/lib/site';

const aboutDescription =
  'Learn how Chartix helps CMT candidates prepare with technical analysis notes, chapter-wise quizzes, and exam performance analytics.';

export const metadata: Metadata = {
  title: 'About Chartix | CMT Exam Prep for Technical Analysis Candidates',
  description: aboutDescription,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Chartix',
    description:
      'Chartix is a focused CMT exam prep platform for technical analysis candidates.',
    url: '/about',
  },
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
    description: 'Foundational principles of technical analysis — theory, charting, trend analysis, and core methods.',
    meta: '13 chapters · 3,500+ questions',
    available: true,
  },
  {
    level: 'CMT Level II',
    description: 'Application of technical analysis — intermarket analysis, trading systems, volatility, and risk management.',
    meta: 'In development',
    available: false,
  },
  {
    level: 'CMT Level III',
    description: 'The work of a technical analyst — portfolio management, behavioral finance, and integrating methods.',
    meta: 'In development',
    available: false,
  },
];

const aboutStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Chartix',
  url: `${siteConfig.url}/about`,
  description: aboutDescription,
  isPartOf: {
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
  },
  about: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutStructuredData) }}
      />
      <main className="bg-white">

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 shadow-sm backdrop-blur">
                <TrendingUp className="h-3.5 w-3.5" /> About Chartix
              </span>
              <h1 className="mt-7 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl font-heading">
                Built by analysts,{' '}
                <span className="relative whitespace-nowrap text-emerald-600">
                  <span className="relative z-10">for analysts.</span>
                  <span className="absolute bottom-1.5 left-0 right-0 h-3 -z-0 rounded bg-emerald-200/60" />
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
                Most CMT prep resources are generic. Chartix is the opposite — a focused platform built by someone who&apos;s actually sat the exams and traded the markets, designed to get you to passing faster.
              </p>

              {/* Trust pills */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                {[
                  { icon: BookOpen, label: 'Level I live now' },
                  { icon: Target, label: 'Syllabus-mapped' },
                  { icon: Brain, label: 'AI tutor included' },
                ].map((pill) => {
                  const Icon = pill.icon;
                  return (
                    <span key={pill.label} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" /> {pill.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-b border-zinc-100 bg-zinc-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl font-heading">Our mission</h2>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  The Chartered Market Technician designation is one of the most respected credentials in technical analysis. We exist to make preparing for it more accessible, efficient, and effective for individual candidates worldwide.
                </p>
                <p className="mt-4 text-base leading-7 text-zinc-500">
                  We believe that with the right tools, anyone with dedication can pass the CMT exams — and we&apos;re building those tools.
                </p>
                <div className="mt-8">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700">
                    Start studying free <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '3,500+', label: 'MCQs per level' },
                  { value: 'Unlimited', label: 'Mock tests' },
                  { value: '13', label: 'Level I chapters' },
                  { value: '100%', label: 'Syllabus covered' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                    <p className="text-3xl font-bold text-zinc-950 font-heading">{stat.value}</p>
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
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">What we stand for</h2>
              <p className="mt-4 text-base leading-7 text-zinc-500">
                Four principles that guide everything we build.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800'}`}>
                      <Icon className="h-5 w-5 text-white" />
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
        <section className="border-y border-zinc-100 bg-zinc-50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">CMT exam coverage</h2>
              <p className="mt-4 text-base leading-7 text-zinc-500">
                Level I is live now. Levels II and III are in active development — all organized to match the actual exam structure.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {levels.map((l) => (
                <div key={l.level} className={`relative rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${l.available ? 'border-zinc-900' : 'border-zinc-200'}`}>
                  {l.available && (
                    <span className="absolute right-4 top-4 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Available now
                    </span>
                  )}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${l.available ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                    <BookOpen className={`h-4 w-4 ${l.available ? 'text-white' : 'text-zinc-400'}`} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-950">{l.level}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{l.description}</p>
                  <div className="mt-4 flex gap-4 text-xs text-zinc-400">
                    <span>{l.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meet the Founder */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Meet the Founder
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl font-heading">
                Built by someone who&apos;s actually traded the markets — not just studied them.
              </h2>
            </div>

            <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm sm:p-10">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {/* Initials avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-md">
                  SJ
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-zinc-950">Sumit Jain</h3>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">Founder, Chartix · CMT Level 3 Cleared</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {['CMT Level 3 Cleared', 'BSE/NSE Certified', 'Mutual Fund Distributor', 'Equity & Derivatives Trader'].map((tag) => (
                      <span key={tag} className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4 text-base leading-7 text-zinc-600">
                <p>
                  Hi, I&apos;m <span className="font-semibold text-zinc-900">Sumit Jain</span> — founder of Chartix and <span className="font-semibold text-zinc-900">CMT Level 3 cleared</span>, based in Mumbai.
                </p>
                <p>
                  I work as an Equity Research Analyst at a Mumbai-based family office, where I&apos;ve spent the last 4+ years analysing the markets across both technical and fundamental angles. I&apos;m BSE/NSE certified, a registered Mutual Fund Distributor, and an active equity &amp; derivatives trader — with deep hands-on experience in chart reading, options strategies, and financial instruments.
                </p>
                <p>
                  I built Chartix because when I was preparing for the CMT exams, I couldn&apos;t find a single resource that explained the concepts clearly, in the way a real practitioner thinks about them. So I created the platform I wish I&apos;d had — structured notes, practice questions, and an AI tutor, all designed to help you actually understand technical analysis and clear the CMT exams with confidence.
                </p>
                <p className="font-semibold text-zinc-900">
                  Have a question about the CMT journey or Chartix? I&apos;d genuinely love to hear from you.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://www.linkedin.com/in/sumitjain-9749041a7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
                >
                  <Linkedin className="h-4 w-4" /> Connect on LinkedIn
                </a>
                <a
                  href="mailto:contact@chartix.in"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700"
                >
                  <Mail className="h-4 w-4" /> Email Me
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-zinc-950 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-heading">
              Start your CMT journey today
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              Create a free account and explore CMT Level I content — no commitment required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800">
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
            <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="https://www.instagram.com/chartix.in" target="_blank" rel="noopener noreferrer" aria-label="Chartix on Instagram">
                <Instagram className="h-4 w-4 text-zinc-400 hover:text-[#E1306C] transition" />
              </a>
              <a href="https://x.com/Sumit_jain01" target="_blank" rel="noopener noreferrer" aria-label="Chartix on X / Twitter">
                <Twitter className="h-4 w-4 text-zinc-400 hover:text-zinc-900 transition" />
              </a>
              <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-950 transition">Home</Link>
              <Link href="/about" className="text-xs text-zinc-400 hover:text-zinc-950 transition">About</Link>
              <Link href="/sign-in" className="text-xs text-zinc-400 hover:text-zinc-950 transition">Sign in</Link>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-center gap-3 border-t border-zinc-50 pt-5 sm:flex-row sm:items-center sm:text-left">
            <Image src="/cmt-prep-provider-badge.png" alt="CMT Association Participating Prep Provider" width={64} height={64} className="shrink-0" />
            <p className="text-center text-[11px] leading-5 text-zinc-400 sm:text-left">
              Chartix is a <strong className="font-semibold text-zinc-500">Participating Prep Provider</strong> of the CMT Association. CMT® and Chartered Market Technician® are registered trademarks owned by the CMT Association.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
