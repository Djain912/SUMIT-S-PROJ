'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';

const SESSION_KEY = 'chartix_ib_banner_v1';
const DELAY_MS = 3 * 60 * 1000; // 3 minutes

function trackEvent(name: string) {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.('event', name, { event_category: 'index_builder_banner' });
  }
}

export function IndexBuilderTimedBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      trackEvent('popup_shown');
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1');
    trackEvent('popup_dismissed');
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="CMT prep offer"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-100 bg-white shadow-xl px-4 py-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-emerald-900">Preparing for CMT?</span>{' '}
            Your free trial includes chapter notes, practice questions, mock tests &amp; Chartix Scholar AI.
          </p>
        </div>
        <Link
          href="/sign-up"
          onClick={() => trackEvent('popup_cta_clicked')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Try Free <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
