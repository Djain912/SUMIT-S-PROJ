import Link from 'next/link';

const highlights = [
  'Supabase Auth with Google and email/password',
  'Chapter, subtopic, notes, and quiz management',
  'Cloudinary uploads for images and PDFs',
  'Secure admin flows with validation and rate limiting',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
            Finance Exam Platform
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            A modular learning system for CMT and stock market exam preparation.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Built for scalable content management, efficient quiz generation, secure authentication,
            and a clean study experience that stays fast as the content library grows.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white"
            >
              User login
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800"
            >
              User sign up
            </Link>
            <Link
              href="/user/quiz"
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800"
            >
              Start quiz
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm"
            >
              <p className="text-sm leading-6 text-zinc-700">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 text-sm text-zinc-500">
          <span className="rounded-full border border-zinc-200 px-4 py-2">Next.js App Router</span>
          <span className="rounded-full border border-zinc-200 px-4 py-2">Tailwind CSS</span>
          <span className="rounded-full border border-zinc-200 px-4 py-2">shadcn/ui</span>
          <span className="rounded-full border border-zinc-200 px-4 py-2">Prisma + PostgreSQL</span>
        </div>
      </section>
    </main>
  );
}
