import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { getAccessByEmail } from '@/server/policies/access';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();

  // Gate the whole student area behind active access (paid or coupon).
  // Admins always pass. Fresh DB lookup so a just-redeemed coupon works instantly.
  const access = await getAccessByEmail(user.email);
  if (!access?.active) {
    redirect('/get-access');
  }

  return (
    <>
      {children}
      <ChatWidget level="LEVEL_1" />
    </>
  );
}
