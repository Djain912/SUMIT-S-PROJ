import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { buildUserRow, formatRevenue, type RawUserForAdmin } from '@/server/services/admin-users.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const now = new Date();

    const [users, total, revenueAgg] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isPremium: true,
          premiumUntil: true,
          couponRedeemed: true,
          passwordHash: true, // used only to detect sign-in method — not sent to client
          createdAt: true,
          trialStartedAt: true,
          trialExpiresAt: true,
          _count: { select: { quizAttempts: true } },
          entitlements: {
            where: { expiresAt: { gt: now } },
            select: { couponCode: true, expiresAt: true, chapter: { select: { level: true } } },
            orderBy: { expiresAt: 'desc' },
          },
          levelTrials: {
            select: { level: true, startedAt: true, expiresAt: true },
          },
          payments: {
            where: { status: 'PAID' },
            select: { level: true, amount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
          activity: {
            select: { lastLoginAt: true, loginCount: true, mcqAttempted: true, mockAttempted: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
      prisma.payment.groupBy({ by: ['currency'], where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);

    const data = users.map((u) => buildUserRow(u as unknown as RawUserForAdmin));
    const revenueLabel = formatRevenue(revenueAgg.map((r) => ({ currency: r.currency, amountMinor: r._sum.amount ?? 0 })));

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit },
      revenueLabel,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load users' } }, { status: 500 });
  }
}

// Grant / revoke / remove a user (admin only).
// action: 'grant_lifetime' | 'revoke' | 'remove'
export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const userId = String(body?.userId ?? '');
    const action = String(body?.action ?? '');
    if (!userId || !['grant_lifetime', 'revoke', 'remove'].includes(action)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request' } }, { status: 400 });
    }

    // Remove — hard-delete the account. The user can sign up again fresh.
    if (action === 'remove') {
      // Safety: do not allow deleting an admin account via this endpoint.
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!target) return NextResponse.json({ success: false, error: { message: 'User not found' } }, { status: 404 });
      if (target.role === 'ADMIN') {
        return NextResponse.json({ success: false, error: { message: 'Cannot remove an admin account.' } }, { status: 403 });
      }
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, data: { removed: true } });
    }

    const data =
      action === 'grant_lifetime'
        ? { isPremium: true, premiumUntil: null, couponRedeemed: 'LIFETIME_ADMIN' }
        : { isPremium: false, premiumUntil: null, couponRedeemed: null };

    const updated = await prisma.user.update({
      where: { id: userId },
      select: { id: true, isPremium: true, premiumUntil: true },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { id: updated.id, isPremium: updated.isPremium, premiumUntil: updated.premiumUntil?.toISOString() ?? null },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to update user' } }, { status: 500 });
  }
}
