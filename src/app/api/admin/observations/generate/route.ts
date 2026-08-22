import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { fetchAllSeries } from '@/lib/observations/fetch-market-data';
import { detectObservations } from '@/lib/observations/detect-observations';
import { polishAllHeadlines } from '@/lib/observations/generate-headlines';

export const maxDuration = 60;

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

    await prisma.marketObservation.deleteMany({ where: { date: today } });

    const series = await fetchAllSeries();
    console.log(`[observations/generate] fetchAllSeries returned ${series.length} series`);
    if (!series.length) {
      return NextResponse.json({ error: 'No market data returned — Yahoo Finance may be blocking this server.' }, { status: 502 });
    }

    const raw = detectObservations(series);
    const observations = await polishAllHeadlines(raw);

    const rows = await prisma.$transaction(
      observations.map((o) =>
        prisma.marketObservation.create({
          data: {
            date: today,
            symbol: o.symbol,
            metricName: o.metricName,
            headline: o.headline,
            subtext: o.subtext ?? '',
            chartSvg: o.chartSvg,
            sourceLine: o.sourceLine,
            score: o.score,
            chartType: o.chartType,
            currentVal: o.currentVal,
            contextNote: o.contextNote,
          },
        }),
      ),
    );

    return NextResponse.json({ count: rows.length, date: today });
  } catch (err) {
    console.error('[observations/generate] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
