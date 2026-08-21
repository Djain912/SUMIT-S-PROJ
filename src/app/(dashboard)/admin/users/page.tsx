import { prisma } from '@/lib/db/prisma';
import { UsersTable } from '@/components/admin/UsersTable';
import { buildUserRow, type RawUserForAdmin } from '@/server/services/admin-users.service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users | Chartix Admin' };

export default async function AdminUsersPage() {
  const now = new Date();

  const [users, total, revenueAgg] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        couponRedeemed: true,
        passwordHash: true,
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
      take: 200,
    }),
    prisma.user.count(),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
  ]);

  const initialUsers = users.map((u) => buildUserRow(u as unknown as RawUserForAdmin));

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <UsersTable
          initialUsers={initialUsers}
          initialMeta={{ total, page: 1, limit: 200 }}
          totalRevenuePaise={revenueAgg._sum.amount ?? 0}
        />
      </div>
    </main>
  );
}
