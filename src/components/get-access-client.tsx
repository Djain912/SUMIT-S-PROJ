'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function CouponRedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/redeem-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data?.error ?? 'Could not redeem this code.');
        return;
      }
      setStatus('success');
      setMessage('Access unlocked! Taking you in...');
      // Hard refresh so the gated layout re-checks access from the DB.
      setTimeout(() => {
        router.push('/user');
        router.refresh();
      }, 900);
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder="Enter coupon code"
            disabled={status === 'loading' || status === 'success'}
            className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-zinc-50"
          />
        </div>
        <button
          type="submit"
          disabled={!code.trim() || status === 'loading' || status === 'success'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </button>
      </div>

      {message && (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${status === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
          {status === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message}
        </p>
      )}
    </form>
  );
}
