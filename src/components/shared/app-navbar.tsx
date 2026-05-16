import { auth } from '@/lib/auth/auth';
import { AppNavbarClient } from './app-navbar-client';

export async function AppNavbar() {
  const session = await auth();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;

  return (
    <AppNavbarClient
      isLoggedIn={!!user}
      role={user?.role ?? null}
      userName={user?.name ?? user?.email ?? null}
    />
  );
}
