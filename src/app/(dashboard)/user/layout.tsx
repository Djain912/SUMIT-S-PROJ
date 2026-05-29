import type { ReactNode } from 'react';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default async function UserLayout({ children }: { children: ReactNode }) {
  await requireAuthenticatedUser();

  // Show chatbot to all logged-in users for now (restrict to premium later when payments are live)
  return (
    <>
      {children}
      <ChatWidget level="LEVEL_1" />
    </>
  );
}
