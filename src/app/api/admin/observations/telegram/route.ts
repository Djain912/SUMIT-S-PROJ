import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { sendDeskToTelegram } from '@/lib/observations/telegram';

export const maxDuration = 60;

// Admin "Send to Telegram" — sends the latest Market Desk run to @Chartix_postbot.
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const latest = await prisma.marketObservation.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
    if (!latest) return NextResponse.json({ error: 'No posts to send yet.' }, { status: 404 });
    const result = await sendDeskToTelegram(latest.date);
    if ('skipped' in result) return NextResponse.json({ error: result.skipped }, { status: 400 });
    return NextResponse.json({ ...result, date: latest.date });
  } catch (err) {
    console.error('[observations/telegram] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}
