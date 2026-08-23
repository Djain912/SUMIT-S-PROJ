'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, MessageSquareHeart, Star } from 'lucide-react';

const ANSWER_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'NO_COMMENT', label: 'No comment' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
];

const QUESTIONS: { key: 'consistent' | 'informed' | 'adequateTime'; text: string }[] = [
  {
    key: 'consistent',
    text: 'Were the educational tools made available consistent with the current CMT Association curriculum and exam question formats?',
  },
  {
    key: 'informed',
    text: 'Were you kept informed by Chartix, in a timely manner, of updates to the CMT Program and of any errata to the study materials?',
  },
  {
    key: 'adequateTime',
    text: 'Were the Chartix materials made available for your study use in adequate time for your exam preparation?',
  },
];

export default function FeedbackPage() {
  const [level, setLevel] = useState('LEVEL_1');
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = rating > 0 && QUESTIONS.every((q) => answers[q.key]);

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, rating, ...answers, comments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-zinc-50/50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">Thank you for your feedback!</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Your input helps us keep Chartix materials current with the CMT curriculum and improve the platform for every candidate.
          </p>
          <Link
            href="/user"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/user" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Help us improve</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            <MessageSquareHeart className="h-7 w-7 text-emerald-600" /> Course Feedback
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            This short survey is about Chartix study materials and services. Your responses are used to keep our
            content consistent with the current CMT Association curriculum and to improve future materials.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
          {/* Level */}
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Which CMT exam level did you most recently prepare for with Chartix?
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: 'LEVEL_1', label: 'Level I' },
                { value: 'LEVEL_2', label: 'Level II' },
                { value: 'LEVEL_3', label: 'Level III' },
                { value: 'GENERAL', label: 'General / exploring' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setLevel(o.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    level === o.value
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Overall, how would you rate the quality of Chartix study materials?
            </label>
            <div className="mt-3 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                  <Star
                    className={`h-8 w-8 transition ${
                      n <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200 hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && <span className="ml-2 text-sm font-medium text-zinc-500">{rating}/5</span>}
            </div>
          </div>

          {/* CMT-guideline questions */}
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <label className="text-sm font-semibold leading-6 text-zinc-900">{q.text}</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {ANSWER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      answers[q.key] === o.value
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Comments */}
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Any other comments or suggestions? <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="What worked well? What should we improve?"
              className="mt-3 w-full rounded-xl border border-zinc-200 p-3.5 text-sm text-zinc-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="w-full rounded-full bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>
      </div>
    </main>
  );
}
