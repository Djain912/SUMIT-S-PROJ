import { prisma } from '@/lib/db/prisma';
import { CouponsManager } from '@/components/admin/CouponsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coupons | Chartix Admin' };

export default async function AdminCouponsPage() {
  const [chapters, coupons] = await Promise.all([
    prisma.chapter.findMany({
      where: { isDeleted: false },
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }, { title: 'asc' }],
      select: { id: true, level: true, title: true, isPublished: true },
    }),
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const initialCoupons = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    days: c.days,
    allChapters: c.allChapters,
    chapterIds: Array.isArray(c.chapterIds) ? (c.chapterIds as string[]) : [],
    isActive: c.isActive,
    maxRedemptions: c.maxRedemptions,
    redeemedCount: c.redeemedCount,
    note: c.note,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Access Control</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Coupons</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Create a code, choose how many days it lasts, and pick exactly which chapters it unlocks. Share the code — when a user redeems it on the access page, those chapters open up for them for the chosen number of days.
          </p>
        </div>
        <CouponsManager chapters={chapters} initialCoupons={initialCoupons} />
      </div>
    </main>
  );
}
