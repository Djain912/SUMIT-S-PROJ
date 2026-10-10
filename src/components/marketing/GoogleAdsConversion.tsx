'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
// window.gtag is typed globally in src/lib/analytics/track.ts

// Fires the Google Ads sign-up conversion once when a new user lands with ?welcome=1
export function GoogleAdsConversion() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('welcome') === '1' && typeof window.gtag === 'function') {
      window.gtag('event', 'ads_conversion_Sign_Up_1', {});
    }
  }, [searchParams]);

  return null;
}
