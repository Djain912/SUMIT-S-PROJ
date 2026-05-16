import { SignUpForm } from '@/components/auth/sign-up-form';

export default function SignUpPage() {
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
