import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { requireAuthenticatedUser } from '@/server/policies/auth';

export default async function SignUpPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    const appUser = await requireAuthenticatedUser();
    redirect(appUser.role === 'ADMIN' ? '/admin' : '/user');
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-950">Create learner account</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Sign up with Google or email/password. Admin access is separate and cannot be created here.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
