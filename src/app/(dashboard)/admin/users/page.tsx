import { prisma } from '@/lib/db/prisma';
import { UsersTable } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users | Chartix Admin' };

export default async function AdminUsersPage() {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isPremium: true,
        passwordHash: true,
        createdAt: true,
        _count: { select: { quizAttempts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.user.count(),
  ]);

  const initialUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName ?? null,
    role: u.role,
    isPremium: u.isPremium,
    signInMethod: (u.passwordHash ? 'Email' : 'Google') as 'Email' | 'Google',
    quizAttempts: u._count.quizAttempts,
    joinedAt: u.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <UsersTable initialUsers={initialUsers} initialMeta={{ total, page: 1, limit: 200 }} />
      </div>
    </main>
  );
}
