'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function StickyCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 420);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Desktop — sticky top bar (below existing navbar via z-index; navbar is z-50) */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 z-40 bg-emerald-900 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-2.5">
          <p className="text-sm font-medium text-emerald-100">
            CMT Level 1 Prep — Free trial includes notes, questions, mock tests &amp; AI tutor
          </p>
          <Link
            href="/sign-up"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            Start Free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Mobile — fixed bottom bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-emerald-900 shadow-lg border-t border-emerald-800">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs font-medium text-emerald-100 leading-5">
            Free trial: notes, MCQs, mock tests &amp; AI tutor
          </p>
          <Link
            href="/sign-up"
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            Start Free <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
