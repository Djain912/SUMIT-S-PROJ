import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { getAccessByEmail, getLevelAccessSummary, type Level } from '@/server/policies/access';
import { prisma } from '@/lib/db/prisma';
import { startLevelTrial } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Start your free trial — Chartix',
  robots: { index: false, follow: false },
};

const LEVEL_DISPLAY_NAME: Record<Level, string> = {
  LEVEL_1: 'CMT Level I',
  LEVEL_2: 'CMT Level II',
  LEVEL_3: 'CMT Level III',
};

const LEVEL_BLURB: Record<Level, string> = {
  LEVEL_1: 'The foundations — chart theory, patterns, trend and indicator basics.',
  LEVEL_2: 'The core toolkit — deeper technical theory, cycles, Elliott Wave and systems.',
  LEVEL_3: 'Portfolio strategy and risk management for the applied exam.',
};

export default async function StartTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect('/sign-up?next=/start-trial');

  // Already has real access (paid, admin, or an active trial for something)?
  // Nothing to choose — send them straight into the app.
  const access = await getAccessByEmail(email);
  if (access?.active) redirect('/user');

  const summary = await getLevelAccessSummary(email);
  const choosable = summary.filter((s) => s.status !== 'unavailable');
  if (choosable.every((s) => s.status !== 'trial-available')) {
    // Every available level has already been tried (or is active/expired) —
    // this page has nothing left to offer, send them to the paywall instead.
    redirect('/get-access');
  }

  // Live counts for the blurb, per choosable level.
  const questionCounts = await Promise.all(
    choosable.map((s) => prisma.question.count({ where: { level: s.level, isPublished: true } })),
  );

  return (
    <div className="min-h-screen bg-[#f0f7f4]">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        {error && (
          <div className="mx-auto mb-8 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-medium text-amber-800">
            {error}
          </div>
        )}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <Sparkles className="h-3 w-3" /> Free 7-Day Trial
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            Which level do you want to try?
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Pick one to unlock a set of chapters free for 7 days. You get one trial per level — no card required.
          </p>
        </div>

        <div className={`mx-auto mt-8 grid max-w-2xl gap-5 ${choosable.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {summary.map((s) => {
            if (s.status === 'unavailable') return null;
            const questionCount = questionCounts[choosable.findIndex((c) => c.level === s.level)] ?? 0;
            const available = s.status === 'trial-available';

            return (
              <div
                key={s.level}
                className={`rounded-2xl border bg-white p-6 shadow-sm ${
                  available ? 'border-emerald-200' : 'border-zinc-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    {LEVEL_DISPLAY_NAME[s.level]}
                  </p>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white ${
                      available ? 'bg-emerald-700' : 'bg-zinc-400'
                    }`}
                  >
                    {s.level === 'LEVEL_1' ? 'L1' : s.level === 'LEVEL_2' ? 'L2' : 'L3'}
                  </div>
                </div>

                <p className="mt-2 text-sm text-zinc-600">{LEVEL_BLURB[s.level]}</p>

                <ul className="mt-4 space-y-1.5 text-xs text-zinc-500">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {s.chapterCount} chapters published
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {questionCount.toLocaleString()} practice questions
                  </li>
                </ul>

                {available ? (
                  <form action={startLevelTrial} className="mt-5">
                    <input type="hidden" name="level" value={s.level} />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Start my free trial
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 text-xs font-semibold text-zinc-400">
                    <Lock className="h-3.5 w-3.5" />
                    {s.status === 'open' ? `Active — ${s.daysRemaining} day${s.daysRemaining === 1 ? '' : 's'} left` : "You've already used this trial"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Already know which level you want full access to?{' '}
          <a href="/get-access" className="font-semibold text-emerald-700 underline underline-offset-2">
            Skip the trial and upgrade
          </a>
        </p>
      </main>
    </div>
  );
}
