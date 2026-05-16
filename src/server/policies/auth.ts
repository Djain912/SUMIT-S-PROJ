import { auth } from '@/lib/auth/auth';

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function getSuperAdminEmail(): string {
  const raw =
    process.env.SUPER_ADMIN_EMAIL ??
    process.env.ADMIN_EMAIL ??
    process.env.ADMIN_EMAILS?.split(',')[0];

  const email = raw?.trim().toLowerCase();
  if (!email) {
    throw new Error('SUPER_ADMIN_EMAIL environment variable is not set.');
  }
  return email;
}

export async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new AuthError('Authentication required');
  }

  const user = session.user as {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: 'ADMIN' | 'USER';
    isPremium: boolean;
    providerAccountId: string;
  };

  return {
    id: user.id,
    providerAccountId: user.providerAccountId,
    supabaseUserId: user.providerAccountId, // backwards compat alias
    email: user.email,
    fullName: user.name ?? null,
    avatarUrl: user.image ?? null,
    role: user.role,
    isPremium: user.isPremium,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();

  try {
    getSuperAdminEmail();
  } catch {
    throw new AuthError('Admin access is not configured on this server', 503);
  }

  if (user.role !== 'ADMIN') {
    throw new AuthError('Admin access required', 403);
  }

  return user;
}
