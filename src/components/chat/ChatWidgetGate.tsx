'use client';

import { usePathname } from 'next/navigation';
import { ChatWidget } from '@/components/chat/ChatWidget';

// Wraps the Scholar chat widget and hides it on the quiz page, so students
// can't use the AI to look up answers while taking a test.
export function ChatWidgetGate({ level }: { level?: string | null }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/user/quiz')) return null;
  return <ChatWidget level={level} />;
}
