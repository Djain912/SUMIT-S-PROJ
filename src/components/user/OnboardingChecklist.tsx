import Link from 'next/link';
import { CheckCircle2, Circle, BookOpen, Brain, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { getTrialState } from '@/server/policies/access';

interface Props {
  userId: string;
  email: string;
}

// Shown only during an active trial when the user hasn't yet completed all
// three starter steps. Disappears automatically once everything is done.
export async function OnboardingChecklist({ userId, email }: Props) {
  const [trial, activity] = await Promise.all([
    getTrialState(email),
    prisma.userActivity.findUnique({
      where: { userId },
      select: { chaptersViewed: true, mcqAttempted: true, scholarUsed: true },
    }),
  ]);

  // Only show during an active trial for non-paid users
  if (!trial || trial.hasFullAccess || !trial.inTrial) return null;

  const chaptersViewed = (activity?.chaptersViewed as string[]) ?? [];
  const openedNote = chaptersViewed.length > 0;
  const tookQuiz = (activity?.mcqAttempted ?? 0) > 0;
  const usedScholar = (activity?.scholarUsed ?? 0) > 0;

  // Hide once all three steps are done
  if (openedNote && tookQuiz && usedScholar) return null;

  const steps = [
    {
      done: openedNote,
      icon: BookOpen,
      label: 'Read your first note',
      description: 'Open Chapter 1 and start reading.',
      href: '/user/notes',
      cta: 'Open Notes →',
    },
    {
      done: tookQuiz,
      icon: Brain,
      label: 'Take your first quiz',
      description: 'Test what you just read with a chapter quiz.',
      href: '/user/quiz',
      cta: 'Start Quiz →',
    },
    {
      done: usedScholar,
      icon: MessageSquare,
      label: 'Ask Chartix Scholar anything',
      description: 'The AI knows the full CMT curriculum. Ask it a question.',
      href: '/user',
      cta: 'Open Scholar →',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Get started</p>
          <p className="mt-0.5 text-sm font-bold text-zinc-900">
            {doneCount === 0
              ? 'Complete these 3 steps to get the most from your trial'
              : `${doneCount} of 3 steps done — keep going`}
          </p>
        </div>
        <span className="text-sm font-bold text-emerald-700">{doneCount}/3</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 ${step.done ? 'opacity-50' : ''}`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-300" />
                )}
              </div>

              {/* Icon + text */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-100">
                  <Icon className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-zinc-400">{step.description}</p>
                </div>
              </div>

              {/* CTA */}
              {!step.done && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
