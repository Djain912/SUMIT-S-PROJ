import { prisma } from '@/lib/db/prisma';
import { BotFeedbackClient } from '@/components/admin/BotFeedbackClient';

export const dynamic = 'force-dynamic';

async function getData() {
  try {
    const [feedback, qaPairs] = await Promise.all([
      prisma.botFeedback.findMany({
        orderBy: [{ rating: 'asc' }, { createdAt: 'desc' }],
        take: 300,
      }),
      prisma.botQAPair.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const userIds = [...new Set(feedback.map((f) => f.userId).filter((id): id is string => !!id))];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
      : [];
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    return {
      feedback: feedback.map((f) => ({ ...f, userEmail: f.userId ? emailById.get(f.userId) ?? null : null })),
      qaPairs,
    };
  } catch {
    return { feedback: [], qaPairs: [] };
  }
}

export default async function BotFeedbackPage() {
  const { feedback, qaPairs } = await getData();

  const likes = feedback.filter((f) => f.rating === 'like').length;
  const dislikes = feedback.filter((f) => f.rating === 'dislike').length;

  return (
    <BotFeedbackClient
      initialFeedback={feedback.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      }))}
      initialQaPairs={qaPairs.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      }))}
      likes={likes}
      dislikes={dislikes}
    />
  );
}
