'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

type SignInFormProps = {
  allowGoogle?: boolean;
  redirectTo?: string;
  showSignUpLink?: boolean;
  submitLabel?: string;
};

export function SignInForm({
  allowGoogle = true,
  redirectTo = '/user',
  showSignUpLink = true,
  submitLabel = 'Sign in',
}: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      setErrorMessage('Invalid email or password.');
      setIsLoading(false);
      return;
    }

    // Fetch session to get role, then navigate
    const res = await fetch('/api/auth/session');
    const sess = await res.json();
    const role = sess?.data?.role;
    window.location.href = role === 'ADMIN' ? '/admin' : redirectTo;
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    await signIn('google', { callbackUrl: `${window.location.origin}${redirectTo}` });
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      {allowGoogle ? (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">or</span>
            <span className="h-px flex-1 bg-zinc-200" />
          </div>
        </>
      ) : null}

      <form onSubmit={signInWithEmail} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Email address</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Password</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Signing in...' : submitLabel}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {showSignUpLink ? (
        <p className="mt-4 text-center text-sm text-zinc-500">
          New learner?{' '}
          <Link href="/sign-up" className="font-semibold text-zinc-950 hover:underline">
            Create an account
          </Link>
        </p>
      ) : null}
    </div>
  );
}
