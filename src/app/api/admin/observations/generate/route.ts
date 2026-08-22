import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { fetchAllSeries } from '@/lib/observations/fetch-market-data';
import { detectObservations } from '@/lib/observations/detect-observations';
import { polishAllHeadlines } from '@/lib/observations/generate-headlines';

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Delete today's existing batch first (regenerate)
  await prisma.marketObservation.deleteMany({ where: { date: today } });

  const series = await fetchAllSeries();
  if (!series.length) {
    return NextResponse.json({ error: 'No market data returned' }, { status: 502 });
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
}
