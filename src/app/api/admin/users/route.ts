import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

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

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isPremium: true,
          premiumUntil: true,
          passwordHash: true, // used only to detect sign-in method — not sent to client
          createdAt: true,
          _count: { select: { quizAttempts: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName ?? null,
      role: u.role,
      isPremium: u.isPremium,
      premiumUntil: u.premiumUntil ? u.premiumUntil.toISOString() : null,
      signInMethod: u.passwordHash ? 'Email' : 'Google',
      quizAttempts: u._count.quizAttempts,
      joinedAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data, meta: { total, page, limit } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load users' } }, { status: 500 });
  }
}

// Grant or revoke access for a specific user (admin only).
// action: 'grant_lifetime' | 'revoke'
export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const userId = String(body?.userId ?? '');
    const action = String(body?.action ?? '');
    if (!userId || !['grant_lifetime', 'revoke'].includes(action)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid request' } }, { status: 400 });
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
