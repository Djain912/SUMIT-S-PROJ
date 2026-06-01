"use client";

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';

interface Props {
  botType: 'public' | 'study';
  question: string;
  answer: string;
}

type State = 'idle' | 'dislike-form' | 'done-like' | 'done-dislike';

export function FeedbackButtons({ botType, question, answer }: Props) {
  const [state, setState] = useState<State>('idle');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(rating: 'like' | 'dislike', userNote = '') {
    setSubmitting(true);
    try {
      await fetch('/api/bot-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType, question, answer, rating, userNote }),
      });
      setState(rating === 'like' ? 'done-like' : 'done-dislike');
    } catch {
      // silent — feedback is best-effort
      setState(rating === 'like' ? 'done-like' : 'done-dislike');
    } finally {
      setSubmitting(false);
    }
  }

  if (state === 'done-like') {
    return <p className="mt-2 text-[10px] text-emerald-600">👍 Thanks for the feedback!</p>;
  }
  if (state === 'done-dislike') {
    return <p className="mt-2 text-[10px] text-zinc-400">👎 Noted — we&apos;ll work on improving this.</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Thumb buttons */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-400 mr-1">Was this helpful?</span>
        <button
          onClick={() => submit('like')}
          disabled={submitting}
          title="Good answer"
          className="rounded-md p-1 text-zinc-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setState((s) => s === 'dislike-form' ? 'idle' : 'dislike-form')}
          disabled={submitting}
          title="Bad answer"
          className={`rounded-md p-1 transition disabled:opacity-40 ${
            state === 'dislike-form'
              ? 'bg-red-50 text-red-500'
              : 'text-zinc-400 hover:bg-red-50 hover:text-red-500'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dislike note form */}
      {state === 'dislike-form' && (
        <div className="space-y-1.5 rounded-lg border border-red-100 bg-red-50/50 p-2.5">
          <p className="text-[10px] font-medium text-red-700">What was wrong? (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. The fee amount was incorrect…"
            rows={2}
            className="w-full resize-none rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-300"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => submit('dislike', note)}
              disabled={submitting}
              className="flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40"
            >
              <Send className="h-3 w-3" /> Submit
            </button>
            <button
              onClick={() => setState('idle')}
              className="rounded-md px-2.5 py-1 text-[11px] text-zinc-400 transition hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
