import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase';
import { SignInForm } from '@/components/auth/sign-in-form';
import { requireAuthenticatedUser } from '@/server/policies/auth';

export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    const appUser = await requireAuthenticatedUser();
    redirect(appUser.role === 'ADMIN' ? '/admin' : '/user');
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-[1.05fr_0.95fr] md:p-8">
        <section className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Super Admin</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Admin console sign in</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              This portal accepts only the single configured super-admin account. Learner accounts cannot access curriculum management.
            </p>
          </div>
          <p className="mt-8 text-xs leading-5 text-zinc-500">
            For students, use the learner sign-in page instead.
          </p>
        </section>
        <section className="flex items-center">
          <div className="w-full">
            <SignInForm
              allowGoogle={false}
              expectedRole="ADMIN"
              redirectTo="/admin"
              showSignUpLink={false}
              submitLabel="Sign in as super admin"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
