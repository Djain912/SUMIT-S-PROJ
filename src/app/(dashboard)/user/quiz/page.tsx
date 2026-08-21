import { QuizPlayer, type LevelStateMap } from '@/components/quiz/quiz-player';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { getLevelAccessSummary } from '@/server/policies/access';

export const metadata = { title: 'Quiz' };

export default async function UserQuizPage() {
  const user = await requireAuthenticatedUser();
  const summary = await getLevelAccessSummary(user.email);
  const levelStates = Object.fromEntries(
    summary.map((s) => [s.level, { status: s.status, daysRemaining: s.daysRemaining }]),
  ) as LevelStateMap;

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <QuizPlayer levelStates={levelStates} />
      </div>
    </main>
  );
}
