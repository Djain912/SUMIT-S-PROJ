import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { hasAnyAccess, hasUnusedTrialLevel } from '@/server/policies/access';
import { ChatWidgetGate } from '@/components/chat/ChatWidgetGate';
import { ConversionPrompt } from '@/components/user/ConversionPrompt';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();

  // Gate the whole student area behind access. Admins and full-premium users
  // always pass; scoped (per-chapter coupon) users pass too and see only their
  // unlocked chapters. Fresh DB lookup so a just-redeemed coupon works instantly.
  const allowed = await hasAnyAccess(user.email);
  if (!allowed) {
    // A brand-new signup (or anyone who's never tried a still-untried level)
    // gets sent to pick a level and start a trial, not straight to the paywall.
    redirect((await hasUnusedTrialLevel(user.email)) ? '/start-trial' : '/get-access');
  }

  return (
    <>
      {children}
      <ChatWidgetGate level="LEVEL_1" />
      <ConversionPrompt />
    </>
  );
}
