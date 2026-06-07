import { auth } from '@/lib/auth/auth';
import { getAccessByEmail } from '@/server/policies/access';
import { AppNavbarClient } from './app-navbar-client';

export async function AppNavbar() {
  const session = await auth();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;

  // Pull fresh access details so the account dropdown shows the real expiry.
  let access: {
    isPremium: boolean;
    premiumUntil: string | null;
    role: 'ADMIN' | 'USER';
    createdAt: string;
    active: boolean;
  } | null = null;
  if (user?.email) {
    const a = await getAccessByEmail(user.email);
    if (a) {
      access = {
        isPremium: a.isPremium,
        premiumUntil: a.premiumUntil ? a.premiumUntil.toISOString() : null,
        role: a.role,
        createdAt: a.createdAt.toISOString(),
        active: a.active,
      };
    }
  }

  return (
    <AppNavbarClient
      isLoggedIn={!!user}
      role={user?.role ?? null}
      userName={user?.name ?? user?.email ?? null}
      userEmail={user?.email ?? null}
      access={access}
    />
  );
}
