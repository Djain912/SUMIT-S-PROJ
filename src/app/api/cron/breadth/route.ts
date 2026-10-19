import { NextResponse } from 'next/server';
import { updateBreadth } from '@/lib/breadth/update';

export const maxDuration = 60;

// Evening Nifty 500 breadth update (vercel.json: 7:00, 8:30 and 10:00 PM IST —
// NSE publishes the day's bhavcopy in the evening). Idempotent.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await updateBreadth());
  } catch (err) {
    console.error('[cron/breadth] failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 502 });
  }
}
