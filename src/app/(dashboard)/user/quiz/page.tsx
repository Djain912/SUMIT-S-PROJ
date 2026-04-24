import { QuizPlayer } from '@/components/quiz/quiz-player';

export default function UserQuizPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">Quiz Center</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Practice by level, chapter, or subtopic</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Start quizzes against the secured quiz APIs. Explanations appear after each answer and results are stored in your attempts history.
          </p>
        </header>

        <QuizPlayer />
      </div>
    </main>
  );
}
