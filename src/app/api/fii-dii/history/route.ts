import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Returns the last N days of stored FII/DII cash data from Neon.
// Used by the FII/DII page to render historical flow charts.
// ?days=90  (default 90, max 365)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '90', 10)));

  try {
    const rows = await prisma.fiiDiiLog.findMany({
      orderBy: { date: 'asc' },
      take: days,
      select: {
        date: true,
        fiiBuy: true, fiiSell: true, fiiNet: true,
        diiBuy: true, diiSell: true, diiNet: true,
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
