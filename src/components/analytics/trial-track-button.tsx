'use client';

import { trackEvent } from '@/lib/analytics/track';

export function TrialTrackButton({ level }: { level: string }) {
  return (
    <button
      type="submit"
      onClick={() => trackEvent('start_trial', { level })}
      className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
    >
      Start my free trial
    </button>
  );
}
