'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signUpWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/user`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (!data.session) {
      setSuccessMessage('Account created. Check your inbox to verify your email, then sign in.');
      setIsLoading(false);
      return;
    }

    router.replace('/user');
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={signUpWithGoogle}
        disabled={isLoading}
        className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Sign up with Google
      </button>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">or</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form onSubmit={handleSignUp} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Full name</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            placeholder="Your name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
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
            placeholder="At least 8 characters"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Creating account...' : 'Create learner account'}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already registered?{' '}
        <Link href="/sign-in" className="font-semibold text-zinc-950 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
