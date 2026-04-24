import { UserNotesClient } from '@/components/user/user-notes';

export default function UserNotesPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <UserNotesClient />
      </div>
    </main>
  );
}