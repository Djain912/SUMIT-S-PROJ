import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { hasAnyAccess, hasUnusedTrialLevel } from '@/server/policies/access';
import { ChatWidgetGate } from '@/components/chat/ChatWidgetGate';
import { ConversionPrompt } from '@/components/user/ConversionPrompt';
import { prisma } from '@/lib/db/prisma';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();

  // "Last active" otherwise only moves on a fresh sign-in; sessions last ~30
  // days. Bump it on page loads, at most once per hour (single conditional
  // UPDATE, no read). Fail-soft: never blocks rendering.
  try {
    await prisma.userActivity.updateMany({
      where: { userId: user.id, lastLoginAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
      data: { lastLoginAt: new Date() },
    });
  } catch (err) {
    console.error('[user-layout] activity touch failed:', err);
  }

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
      <Suspense fallback={null}><ChatWidgetGate /></Suspense>
      <ConversionPrompt />
    </>
  );
}
