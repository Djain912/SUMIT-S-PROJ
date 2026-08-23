'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { ChatWidget } from '@/components/chat/ChatWidget';

// Wraps the Scholar chat widget and hides it on the quiz page, so students
// can't use the AI to look up answers while taking a test.
// The level is read from the URL (?level=LEVEL_2) so the header stays in sync
// with whichever level the student is currently browsing.
export function ChatWidgetGate({ level: defaultLevel }: { level?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname?.startsWith('/user/quiz')) return null;
  const level = searchParams.get('level') ?? defaultLevel ?? null;
  return <ChatWidget level={level} />;
}
