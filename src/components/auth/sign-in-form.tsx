'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

type ExpectedRole = 'ADMIN' | 'USER';

type SignInFormProps = {
  allowGoogle?: boolean;
  expectedRole?: ExpectedRole;
  redirectTo?: string;
  showSignUpLink?: boolean;
  submitLabel?: string;
};

async function loadSessionRole(): Promise<ExpectedRole | null> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    return null;
  }

  return payload.data?.role ?? null;
}

async function waitForSessionRole(maxAttempts = 4): Promise<ExpectedRole | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const role = await loadSessionRole();
    if (role) {
      return role;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 150 * (attempt + 1));
    });
  }

  return null;
}

export function SignInForm({
  allowGoogle = true,
  expectedRole = 'USER',
  redirectTo = '/user',
  showSignUpLink = true,
  submitLabel = 'Sign in',
}: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function finishSignIn() {
    const supabase = createSupabaseBrowserClient();
    const role = await waitForSessionRole();

    if (expectedRole === 'ADMIN' && role !== 'ADMIN') {
      await supabase.auth.signOut();
      setErrorMessage('This portal is only for the configured super admin account.');
      setIsLoading(false);
      return;
    }

    const nextPath = role === 'ADMIN' ? '/admin' : redirectTo;
    router.replace(nextPath);
    router.refresh();
  }

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    await finishSignIn();
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    const nextParam = encodeURIComponent(redirectTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextParam}`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
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
            onChange={(event) => setEmail(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={expectedRole === 'ADMIN' ? 'current-password' : 'current-password'}
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
