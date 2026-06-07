import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { hasAnyAccess } from '@/server/policies/access';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();

  // Gate the whole student area behind access. Admins and full-premium users
  // always pass; scoped (per-chapter coupon) users pass too and see only their
  // unlocked chapters. Fresh DB lookup so a just-redeemed coupon works instantly.
  const allowed = await hasAnyAccess(user.email);
  if (!allowed) {
    redirect('/get-access');
  }

  return (
    <>
      {children}
      <ChatWidget level="LEVEL_1" />
    </>
  );
}
