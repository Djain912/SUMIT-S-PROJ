import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET — list all coupons (newest first).
export async function GET() {
  try {
    await requireAdminUser();
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: coupons });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to load coupons' } }, { status: 500 });
  }
}

// POST — create a coupon.
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();

    const code = String(body?.code ?? '').trim().toUpperCase();
    const note = body?.note ? String(body.note).trim().slice(0, 200) : null;
    const maxRedemptions = body?.maxRedemptions != null && body.maxRedemptions !== ''
      ? Math.max(1, Math.floor(Number(body.maxRedemptions)))
      : null;
    const isDiscount = Boolean(body?.discountType);

    if (!code || !/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json({ success: false, error: { message: 'Code must be 3–40 letters, numbers, - or _ (no spaces).' } }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: { message: 'A coupon with that code already exists.' } }, { status: 409 });
    }

    let coupon;

    if (isDiscount) {
      const discountType = String(body.discountType) as 'PERCENT' | 'FIXED';
      if (discountType !== 'PERCENT' && discountType !== 'FIXED') {
        return NextResponse.json({ success: false, error: { message: 'Invalid discount type.' } }, { status: 400 });
      }
      const discountValue = Math.floor(Number(body?.discountValue));
      if (!Number.isFinite(discountValue) || discountValue < 1) {
        return NextResponse.json({ success: false, error: { message: 'Discount value must be at least 1.' } }, { status: 400 });
      }
      if (discountType === 'PERCENT' && discountValue > 90) {
        return NextResponse.json({ success: false, error: { message: 'Percent discount cannot exceed 90%.' } }, { status: 400 });
      }
      const minOrderPaise = body?.minOrderPaise ? Math.max(1, Math.floor(Number(body.minOrderPaise))) : null;

      coupon = await prisma.coupon.create({
        data: { code, note, maxRedemptions, discountType, discountValue, minOrderPaise },
      });
    } else {
      const days = Math.floor(Number(body?.days));
      const allChapters = Boolean(body?.allChapters);
      const chapterIds: string[] = Array.isArray(body?.chapterIds) ? body.chapterIds.map(String) : [];

      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        return NextResponse.json({ success: false, error: { message: 'Days must be between 1 and 3650.' } }, { status: 400 });
      }
      if (!allChapters && chapterIds.length === 0) {
        return NextResponse.json({ success: false, error: { message: 'Pick at least one chapter, or choose Full Access.' } }, { status: 400 });
      }

      coupon = await prisma.coupon.create({
        data: { code, days, allChapters, chapterIds: allChapters ? [] : chapterIds, note, maxRedemptions },
      });
    }

    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to create coupon' } }, { status: 500 });
  }
}

// PATCH — toggle active state. DELETE — remove a coupon.
export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const id = String(body?.id ?? '');
    if (!id) return NextResponse.json({ success: false, error: { message: 'Missing coupon id' } }, { status: 400 });
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { isActive: Boolean(body?.isActive) },
    });
    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to update coupon' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: { message: 'Missing coupon id' } }, { status: 400 });
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Unable to delete coupon' } }, { status: 500 });
  }
}
