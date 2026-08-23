import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { fetchAllSeries } from '@/lib/observations/fetch-market-data';
import { detectObservations } from '@/lib/observations/detect-observations';
import { polishAllHeadlines } from '@/lib/observations/generate-headlines';

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Idempotent — skip if already generated today
  const existing = await prisma.marketObservation.count({ where: { date: today } });
  if (existing > 0) {
    return NextResponse.json({ skipped: true, date: today, existing });
  }

  const series = await fetchAllSeries();
  if (!series.length) {
    return NextResponse.json({ error: 'No market data' }, { status: 502 });
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
