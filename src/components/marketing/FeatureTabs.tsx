'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, ListChecks, BarChart2, Brain,
  ArrowRight, CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    id: 'notes',
    label: 'Chapter Notes',
    icon: BookOpen,
    headline: 'Every chapter. Every level.',
    sub: 'Structured, exam-mapped notes for all CMT Level I, II & III chapters. Written for clarity — not just coverage.',
    bullets: [
      'All 3 levels covered',
      'Mapped to official CMT LOS',
      'Quick Revision Sheets included',
      'Lightbox figures & diagrams',
    ],
  },
  {
    id: 'questions',
    label: 'Questions',
    icon: ListChecks,
    headline: '2,000+ questions at real exam difficulty.',
    sub: 'Practice questions written at CMT exam standard, organised by chapter, subtopic, and difficulty. Unlimited mock tests.',
    bullets: [
      '2,000+ MCQs across all levels',
      'Topic-wise & full mock tests',
      '170Q mock for Level II (4-hr format)',
      'Instant explanations on every question',
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart2,
    headline: 'Know exactly where you stand.',
    sub: 'SWOT matrix, chapter-by-chapter accuracy, exam weight vs. your score — so you always know where to focus next.',
    bullets: [
      'SWOT matrix by exam domain weight',
      'Chapter & subtopic accuracy breakdown',
      'Streak tracking & time spent',
      'Personalised weak-topic alerts',
    ],
  },
  {
    id: 'scholar',
    label: 'Scholar AI',
    icon: Brain,
    headline: 'Your CMT tutor. Always on.',
    sub: 'Chartix Scholar explains concepts intuitively — not just textbook definitions. Ask anything about the curriculum.',
    bullets: [
      'Trained on the full CMT curriculum',
      'Intuition-first explanations',
      'Complete examples, not half-answers',
      'Highlights what matters for the exam',
    ],
  },
];

export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];

  return (
    <section className="bg-zinc-950 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">What&apos;s inside</span>
        </div>
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Everything you need to pass.
        </h2>

        {/* Tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setActive(i)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  active === i
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                    : 'border border-zinc-700 text-zinc-400 hover:border-emerald-600 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-900/50 px-3 py-1">
                <feat.icon className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">{feat.label}</span>
              </div>
              <h3 className="text-2xl font-bold text-white sm:text-3xl">{feat.headline}</h3>
              <p className="mt-3 text-base leading-relaxed text-zinc-400">{feat.sub}</p>
              <ul className="mt-6 space-y-2.5">
                {feat.bullets.map(b => (
                  <li key={b} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
              >
                Try it free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right: abstract visual */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900">
                    <feat.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="h-3 w-24 rounded bg-zinc-800" />
                </div>
                {[80, 60, 90, 50, 70].map((w, i) => (
                  <div key={i} className="mb-2.5 h-2.5 rounded bg-zinc-800" style={{ width: `${w}%` }} />
                ))}
                <div className="mt-5 rounded-lg border border-emerald-900/60 bg-emerald-900/20 p-3">
                  <div className="mb-2 h-2 w-16 rounded bg-emerald-800/60" />
                  {[100, 75, 85].map((w, i) => (
                    <div key={i} className="mb-1.5 h-2 rounded bg-emerald-800/40" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
