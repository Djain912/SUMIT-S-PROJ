'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export function BlogSubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Mail className="h-5 w-5 text-emerald-700" />
        </div>
        <p className="font-semibold text-emerald-900">You&apos;re subscribed!</p>
        <p className="mt-1 text-sm text-emerald-700">You&apos;ll get new posts straight to your inbox.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-zinc-500" />
        <p className="font-semibold text-zinc-900 text-sm">Get new posts in your inbox</p>
      </div>
      <p className="text-xs text-zinc-500 mb-4">No spam. Just CMT insights and new articles from Chartix.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === 'loading'}
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
