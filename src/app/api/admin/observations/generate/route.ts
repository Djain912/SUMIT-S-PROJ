import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { runMarketDesk } from '@/lib/observations/run';

export const maxDuration = 60;

// Admin "Generate today's desk" — replaces today's posts with a fresh run.
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    // Regenerates the morning desk; an evening run (if any) is kept.
    await prisma.marketObservation.deleteMany({ where: { date: today, OR: [{ slot: 'morning' }, { slot: null }] } });
    const result = await runMarketDesk(today, { slot: 'morning', maxPosts: 6 });
    return NextResponse.json({ ...result, date: today });
  } catch (err) {
    console.error('[observations/generate] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
