import { auth } from '@/lib/auth/auth';
import { getAccessByEmail, getLevelAccessSummary } from '@/server/policies/access';
import { AppNavbarClient } from './app-navbar-client';

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'I',
  LEVEL_2: 'II',
  LEVEL_3: 'III',
};

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
  let levelLabel = 'CMT Level I';

  if (user?.email) {
    const [a, summary] = await Promise.all([
      getAccessByEmail(user.email),
      getLevelAccessSummary(user.email),
    ]);
    if (a) {
      access = {
        isPremium: a.isPremium,
        premiumUntil: a.premiumUntil ? a.premiumUntil.toISOString() : null,
        role: a.role,
        createdAt: a.createdAt.toISOString(),
        active: a.active,
      };
    }
    // Build label from levels that are open/in-trial (not unavailable or expired)
    const accessible = summary
      .filter((s) => s.status === 'open' || s.chapterCount > 0)
      .map((s) => LEVEL_LABELS[s.level])
      .filter(Boolean);
    if (accessible.length > 0) {
      levelLabel = accessible.length === 1
        ? `CMT Level ${accessible[0]}`
        : `CMT Level ${accessible.slice(0, -1).join(', ')} & ${accessible[accessible.length - 1]}`;
    }
  }

  return (
    <AppNavbarClient
      isLoggedIn={!!user}
      role={user?.role ?? null}
      userName={user?.name ?? user?.email ?? null}
      userEmail={user?.email ?? null}
      access={access}
      levelLabel={levelLabel}
    />
  );
}
