import { QuizPlayer } from '@/components/quiz/quiz-player';

export const metadata = { title: 'Quiz' };

export default function UserQuizPage() {
  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <QuizPlayer />
      </div>
    </main>
  );
}
