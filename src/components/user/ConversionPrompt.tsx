'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';

type Status = {
  showPrompts: boolean;
  inTrial?: boolean;
  expired?: boolean;
  daysRemaining?: number;
  mockAttempted?: number;
  mcqAttempted?: number;
};

type Prompt = { key: string; title: string; body: string; cta: string };

const SEEN_KEY = 'chartix-conversion-prompts-seen';

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}
function markSeen(key: string) {
  try {
    const seen = readSeen();
    if (!seen.includes(key)) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, key]));
  } catch {
    /* ignore */
  }
}

// Highest-priority trigger first. Each fires once (then it's remembered as seen).
function pickPrompt(s: Status, seen: string[]): Prompt | null {
  const candidates: (Prompt | false | undefined)[] = [
    s.expired && {
      key: 'expiry',
      title: 'Your trial has expired',
      body: 'Subscribe to continue your CMT preparation — all your progress is saved.',
      cta: 'Subscribe Now',
    },
    s.inTrial && (s.daysRemaining ?? 99) <= 2 && {
      key: 'two-days-left',
      title: `Only ${s.daysRemaining} ${s.daysRemaining === 1 ? 'day' : 'days'} left in your free trial`,
      body: 'Unlock full access before your trial ends and keep your momentum going.',
      cta: 'Unlock Full Access',
    },
    (s.mockAttempted ?? 0) >= 2 && {
      key: 'second-mock',
      title: 'You have used all your free mock tests',
      body: 'Upgrade now for unlimited mock exams and detailed performance analytics.',
      cta: 'Upgrade Now',
    },
    (s.mockAttempted ?? 0) >= 1 && {
      key: 'first-mock',
      title: 'Ready for the real exam?',
      body: 'Unlock unlimited mock exams and detailed analytics to track every attempt.',
      cta: 'Unlock Mock Exams',
    },
    (s.mcqAttempted ?? 0) >= 50 && {
      key: 'fifty-mcqs',
      title: "You're making great progress",
      body: 'Unlock 3,500+ additional practice questions across the full curriculum.',
      cta: 'Unlock Question Bank',
    },
    (s.mcqAttempted ?? 0) >= 1 && {
      key: 'first-chapter',
      title: 'Great start on your preparation',
      body: 'Unlock the remaining curriculum and the full question bank to go deeper.',
      cta: 'See Full Access',
    },
  ];

  for (const c of candidates) {
    if (c && !seen.includes(c.key)) return c;
  }
  return null;
}

// Floating, dismissible upgrade nudge shown across the student area for trial
// users. Picks the most relevant trigger and remembers what's been dismissed.
export function ConversionPrompt() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/trial-status', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const s: Status | undefined = json?.data;
        if (!s?.showPrompts || cancelled) return;
        const chosen = pickPrompt(s, readSeen());
        if (chosen && !cancelled) setPrompt(chosen);
      } catch {
        /* fail-soft: no prompt */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prompt) return null;

  const dismiss = () => {
    markSeen(prompt.key);
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <div className="relative rounded-2xl border border-emerald-200 bg-white p-5 shadow-xl">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-emerald-600">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-widest">Chartix</span>
        </div>
        <p className="mt-2 pr-4 text-sm font-bold text-zinc-900">{prompt.title}</p>
        <p className="mt-1 text-sm text-zinc-600">{prompt.body}</p>
        <Link
          href="/get-access"
          onClick={dismiss}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          {prompt.cta}
        </Link>
      </div>
    </div>
  );
}
