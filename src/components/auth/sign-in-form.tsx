'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

type SignInFormProps = {
  allowGoogle?: boolean;
  redirectTo?: string;
  showSignUpLink?: boolean;
  submitLabel?: string;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function SignInForm({
  allowGoogle = true,
  redirectTo = '/user',
  showSignUpLink = true,
  submitLabel = 'Sign in',
}: SignInFormProps) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);

  const signInWithEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      setErrorMessage('Invalid email or password. Please try again.');
      setIsLoading(false);
      return;
    }

    // Use /api/me (not /api/auth/session — that's reserved for NextAuth SessionProvider)
    const res  = await fetch('/api/me');
    const sess = await res.json();
    const role = sess?.data?.role;
    window.location.href = role === 'ADMIN' ? '/admin' : redirectTo;
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    await signIn('google', { callbackUrl: `${window.location.origin}${redirectTo}` });
  };

  const anyLoading = isLoading || googleLoading;

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Welcome back</h2>
        <p className="mt-1.5 text-sm text-zinc-500">Sign in to continue your CMT preparation</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        {/* Google */}
        {allowGoogle && (
          <>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={anyLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-zinc-100" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">or</span>
              <span className="h-px flex-1 bg-zinc-100" />
            </div>
          </>
        )}

        {/* Email / password form */}
        <form onSubmit={signInWithEmail} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={anyLoading}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <Link
                href="/reset-password"
                className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={anyLoading}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={anyLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : submitLabel}
          </button>
        </form>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Sign up link */}
      {showSignUpLink && (
        <p className="text-center text-sm text-zinc-500">
          New to Chartix?{' '}
          <Link href="/sign-up" className="font-semibold text-zinc-950 underline-offset-2 hover:underline transition">
            Create a free account
          </Link>
        </p>
      )}
    </div>
  );
}
