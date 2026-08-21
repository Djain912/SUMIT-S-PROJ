'use client';

import { useSession } from 'next-auth/react';
import { GoogleAnalytics } from '@next/third-parties/google';

/**
 * Loads Google Analytics 4 for real visitors only.
 *
 * Staff (role === 'ADMIN') are treated as internal traffic and are never
 * tracked — on any page, not just /admin — so their activity stops inflating
 * the numbers in the analytics dashboard. This is IP-independent, so it works
 * no matter which network or device an admin is on.
 *
 * We wait until the session has resolved before mounting GA. For the common
 * case (anonymous visitors) the session resolves to "unauthenticated" almost
 * immediately, and GA still captures the landing page view because gtag sends
 * a page_view when it initialises. This runs client-side only, so it has no
 * effect on static generation of the marketing/blog pages.
 */
export function GaGate({ gaId }: { gaId: string }) {
  const { data: session, status } = useSession();

  // Don't mount GA until we know who the visitor is — avoids briefly tracking
  // an admin before their role is known.
  if (status === 'loading') return null;

  // Internal/staff traffic: never load analytics.
  if (session?.user?.role === 'ADMIN') return null;

  return <GoogleAnalytics gaId={gaId} />;
}
