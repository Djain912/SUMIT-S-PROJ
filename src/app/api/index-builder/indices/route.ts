import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { indexInputSchema } from '@/lib/index-builder/validate';
import { serializeIndex } from '@/lib/index-builder/repository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cap so a single account can't create unlimited rows.
const MAX_INDICES_PER_USER = 200;

// GET — list the signed-in user's saved indices, newest first.
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const rows = await prisma.index.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: rows.map(serializeIndex) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to view your indices' } }, { status: 401 });
    }
    console.error('[index-builder/indices GET] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not load your indices' } }, { status: 500 });
  }
}

// POST — create a new index (also used for "Save as" / duplicate).
export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }
    const user = await requireAuthenticatedUser();

    const limit = await enforceRateLimit({ request, key: 'index-save', maxRequests: 60, windowMs: 60_000, identifier: user.id });
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: { message: 'Saving too fast — please slow down.' } }, { status: 429 });
    }

    const parsed = indexInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { message: 'Invalid index data' } }, { status: 400 });
    }

    const count = await prisma.index.count({ where: { userId: user.id } });
    if (count >= MAX_INDICES_PER_USER) {
      return NextResponse.json({ success: false, error: { message: `You've reached the limit of ${MAX_INDICES_PER_USER} saved indices.` } }, { status: 409 });
    }

    const d = parsed.data;
    const row = await prisma.index.create({
      data: {
        userId: user.id,
        name: d.name,
        weightingType: d.weightingType,
        constituents: d.constituents,
        customWeights: d.customWeights ?? undefined,
        chartState: d.chartState ? (d.chartState as object) : undefined,
        description: d.description ?? null,
        visibility: d.visibility ?? 'PRIVATE',
      },
    });
    return NextResponse.json({ success: true, data: serializeIndex(row) }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to save indices' } }, { status: 401 });
    }
    console.error('[index-builder/indices POST] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not save your index' } }, { status: 500 });
  }
}
