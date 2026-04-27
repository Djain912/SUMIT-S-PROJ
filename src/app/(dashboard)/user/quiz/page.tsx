import { QuizPlayer } from '@/components/quiz/quiz-player';

export default function UserQuizPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <QuizPlayer />
      </div>
    </main>
  );
}
