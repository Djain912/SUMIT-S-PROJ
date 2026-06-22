'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const inputCls =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400';
const btnCls =
  'w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60';

// Step 1 — request a reset link by email.
function RequestForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? 'If an account exists for that email, a reset link is on its way.');
      setStatus('sent');
    } catch {
      setMessage('If an account exists for that email, a reset link is on its way.');
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm leading-6 text-zinc-700">{message}</p>
        <Link href="/sign-in" className="inline-block text-sm font-semibold text-zinc-950 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <input
        className={inputCls}
        placeholder="Email address"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <button className={btnCls} type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send reset link'}
      </button>
      <Link href="/sign-in" className="block pt-1 text-center text-xs text-zinc-500 hover:text-zinc-800">
        Back to sign in
      </Link>
    </form>
  );
}

// Step 2 — choose a new password using the token from the email link.
function ConfirmForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Could not reset password.');
        setStatus('idle');
        return;
      }
      setStatus('done');
    } catch {
      setError('Could not reset password. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm leading-6 text-zinc-700">Your password has been reset. You can now sign in with your new password.</p>
        <Link href="/sign-in" className="inline-block rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <input
        className={inputCls}
        placeholder="New password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <input
        className={inputCls}
        placeholder="Confirm new password"
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className={btnCls} type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}

function ResetPasswordInner() {
  const token = useSearchParams().get('token');
  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-950">Reset password</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {token
            ? 'Choose a new password for your account.'
            : 'Enter your email and we’ll send you a reset link.'}
        </p>
      </div>
      {token ? <ConfirmForm token={token} /> : <RequestForm />}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md text-sm text-zinc-500">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
