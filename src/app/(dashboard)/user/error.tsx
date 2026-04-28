'use client';

import { useEffect } from 'react';

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('User dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="text-sm text-zinc-500">{error.message ?? 'An unexpected error occurred.'}</p>
      <button
        onClick={reset}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
      >
        Try again
      </button>
    </div>
  );
}
