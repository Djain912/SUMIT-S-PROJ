export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Reset password</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Request a password reset link for your email address.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <input
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
          placeholder="Email address"
          type="email"
        />
        <button className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100">
          Send reset link
        </button>
      </div>
    </div>
  );
}
