'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: { label: string; text: string }[];
  correctIndex: number;
  explanation: string;
}

interface QuizWidgetProps {
  question: QuizQuestion;
  showCtaAfterAnswer?: boolean;
  analyticsPrefix?: string;
}

function trackEvent(name: string) {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.('event', name, { event_category: 'quiz_widget' });
  }
}

export function QuizWidget({ question, showCtaAfterAnswer = true, analyticsPrefix = 'qod' }: QuizWidgetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6 shadow-sm">
      <p className="text-sm font-semibold text-zinc-800 leading-6 mb-4">{question.question}</p>

      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;

          let cls =
            'w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors ';
          if (!answered) {
            cls += 'border-zinc-200 bg-zinc-50 hover:border-emerald-300 hover:bg-emerald-50 text-zinc-700 cursor-pointer';
          } else if (isCorrect) {
            cls += 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-default';
          } else if (isSelected) {
            cls += 'border-red-300 bg-red-50 text-red-800 cursor-default';
          } else {
            cls += 'border-zinc-100 bg-zinc-50/50 text-zinc-400 cursor-default';
          }

          return (
            <button
              key={i}
              className={cls}
              onClick={() => {
                if (!answered) {
                  setSelected(i);
                  trackEvent(isCorrect ? `${analyticsPrefix}_answered_correct` : `${analyticsPrefix}_answered_wrong`);
                }
              }}
              disabled={answered}
            >
              <span className="flex items-center gap-2">
                {answered && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span>
                  <strong>{opt.label})</strong> {opt.text}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <p className="text-sm text-emerald-800">
            <strong>
              {selected === question.correctIndex
                ? 'Correct!'
                : `Incorrect — the answer is ${question.options[question.correctIndex].label}.`}
            </strong>{' '}
            {question.explanation}
          </p>
        </div>
      )}

      {answered && showCtaAfterAnswer && (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-zinc-600">
            Want more? Your free trial includes chapter-wise notes, unlimited questions, mock tests & Chartix Scholar AI
          </p>
          <Link
            href="/sign-up"
            onClick={() => trackEvent(`${analyticsPrefix}_cta_clicked`)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 whitespace-nowrap"
          >
            Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
