import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { indexUpdateSchema } from '@/lib/index-builder/validate';
import { serializeIndex, generateShareId } from '@/lib/index-builder/repository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

// Loads an index only if it belongs to the signed-in user (per-user access
// control — our equivalent of row-level security). Returns null otherwise.
async function getOwned(id: string, userId: string) {
  const row = await prisma.index.findUnique({ where: { id } });
  return row && row.userId === userId ? row : null;
}

// GET — fetch one of the user's own indices.
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;
    const row = await getOwned(id, user.id);
    if (!row) return NextResponse.json({ success: false, error: { message: 'Index not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: serializeIndex(row) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    console.error('[index-builder/indices/[id] GET] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not load the index' } }, { status: 500 });
  }
}

// PATCH — update name / constituents / weighting / weights / description /
// visibility. Going PUBLIC mints a shareId (kept once minted so links persist).
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }
    const user = await requireAuthenticatedUser();
    const { id } = await params;
    const existing = await getOwned(id, user.id);
    if (!existing) return NextResponse.json({ success: false, error: { message: 'Index not found' } }, { status: 404 });

    const parsed = indexUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid index data' } }, { status: 400 });

    const d = parsed.data;
    const data: Prisma.IndexUpdateInput = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.weightingType !== undefined) data.weightingType = d.weightingType;
    if (d.constituents !== undefined) data.constituents = d.constituents;
    if (d.customWeights !== undefined) data.customWeights = d.customWeights ?? Prisma.JsonNull;
    if (d.description !== undefined) data.description = d.description ?? null;
    if (d.visibility !== undefined) {
      data.visibility = d.visibility;
      // Mint a share id the first time it goes public; keep it thereafter.
      if (d.visibility === 'PUBLIC' && !existing.shareId) data.shareId = generateShareId();
    }

    const row = await prisma.index.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: serializeIndex(row) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    console.error('[index-builder/indices/[id] PATCH] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not update the index' } }, { status: 500 });
  }
}

// DELETE — remove one of the user's own indices.
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request origin' } }, { status: 403 });
    }
    const user = await requireAuthenticatedUser();
    const { id } = await params;
    const existing = await getOwned(id, user.id);
    if (!existing) return NextResponse.json({ success: false, error: { message: 'Index not found' } }, { status: 404 });
    await prisma.index.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: 'Sign in to continue' } }, { status: 401 });
    console.error('[index-builder/indices/[id] DELETE] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not delete the index' } }, { status: 500 });
  }
}
