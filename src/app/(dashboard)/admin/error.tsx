'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const isAuthError =
    error.message?.toLowerCase().includes('authentication') ||
    error.message?.toLowerCase().includes('auth') ||
    error.message?.toLowerCase().includes('sign in') ||
    error.name === 'AuthError';

  useEffect(() => {
    console.error('Admin error:', error.message);
    // Auto-redirect to sign-in on auth errors
    if (isAuthError) {
      router.replace('/sign-in?next=/admin');
    }
  }, [error, isAuthError, router]);

  if (isAuthError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-zinc-500">Session expired. Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
      <p className="text-sm text-zinc-500 max-w-sm">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
      >
        Try again
      </button>
    </div>
  );
}
