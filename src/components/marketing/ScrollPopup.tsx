'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';

const SESSION_KEY = 'chartix_scroll_popup_v1';

function trackEvent(name: string) {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.('event', name, { event_category: 'scroll_popup' });
  }
}

export function ScrollPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    function handleScroll() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const pct = (window.scrollY / docH) * 100;
      if (pct >= 60) {
        setVisible(true);
        window.removeEventListener('scroll', handleScroll);
        trackEvent('popup_shown');
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1');
    trackEvent('popup_dismissed');
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CMT free trial offer"
      className="fixed bottom-6 right-4 z-50 w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl sm:right-6 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-base font-bold text-emerald-900 pr-6">Preparing for CMT?</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Your free trial includes chapter-wise notes, practice questions, mock tests and Chartix Scholar — our AI tutor. No credit card needed.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/sign-up"
          onClick={() => { dismiss(); trackEvent('popup_cta_clicked'); }}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button onClick={dismiss} className="text-xs text-zinc-400 hover:text-zinc-600 transition">
          No thanks
        </button>
      </div>
    </div>
  );
}
