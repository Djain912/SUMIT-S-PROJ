import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase';
import { SignInForm } from '@/components/auth/sign-in-form';
import { requireAuthenticatedUser } from '@/server/policies/auth';

type SignInPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    const appUser = await requireAuthenticatedUser();
    redirect(appUser.role === 'ADMIN' ? '/admin' : '/user');
  }

  const resolvedSearchParams = await searchParams;
  const nextPath =
    resolvedSearchParams?.next &&
    resolvedSearchParams.next.startsWith('/') &&
    !resolvedSearchParams.next.startsWith('/admin')
      ? resolvedSearchParams.next
      : '/user';

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-950">Learner sign in</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Use Google or email/password to access your learning dashboard.
        </p>
      </div>
      <SignInForm redirectTo={nextPath} submitLabel="Sign in to dashboard" />
    </div>
  );
}
