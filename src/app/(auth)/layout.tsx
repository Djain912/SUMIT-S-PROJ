import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { TrendingUp, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const features = [
  'CMT curriculum mapped chapter by chapter',
  '2,000+ practice MCQs at real exam difficulty',
  'Unlimited mock tests & customised MCQ sets',
  'Analytics to identify and fix weak areas',
  'Chartix AI chatbot trained on CMT material',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen">

      {/* ── Left panel: dark brand ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex lg:w-[58%]">
        {/* Subtle glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_-10%,rgba(16,185,129,0.12),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-zinc-950 to-transparent" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Chartix</span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
            CMT Prep
          </span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.6rem] font-bold leading-[1.15] tracking-tight text-white">
              Your CMT exam<br />command centre.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-zinc-400">
              Structured notes, adaptive quizzes, and deep analytics — everything you need to pass CMT Level I, II &amp; III.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>

          {/* Platform info card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">What you get</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '2,000+', label: 'Practice MCQs' },
                { value: '∞', label: 'Mock Tests' },
                { value: '3', label: 'CMT Levels' },
                { value: '6 Months', label: 'Access per level' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-zinc-800/60 p-3">
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom info — only real facts */}
        <div className="relative z-10 grid grid-cols-3 gap-6">
          {[
            { value: '3',      label: 'CMT Levels covered' },
            { value: '2,000+', label: 'Practice MCQs' },
            { value: '6 Months',   label: 'Access per level' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-950">Chartix</span>
        </Link>

        <div className="w-full max-w-[400px]">
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-600 transition">Terms</Link>
          {' '}&amp;{' '}
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-zinc-600 transition">Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
