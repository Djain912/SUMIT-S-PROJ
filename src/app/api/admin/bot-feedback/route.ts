import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const botType = searchParams.get('botType'); // optional filter
    const rating = searchParams.get('rating');   // optional filter

    const where: Record<string, string> = {};
    if (botType) where.botType = botType;
    if (rating) where.rating = rating;

    const feedback = await prisma.botFeedback.findMany({
      where,
      orderBy: [{ rating: 'asc' }, { createdAt: 'desc' }], // dislikes first
      take: 200,
    });

    const likes = feedback.filter((f) => f.rating === 'like').length;
    const dislikes = feedback.filter((f) => f.rating === 'dislike').length;

    return NextResponse.json({ success: true, data: { feedback, likes, dislikes } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    return NextResponse.json({ success: false, error: { message: 'Failed' } }, { status: 500 });
  }
}
