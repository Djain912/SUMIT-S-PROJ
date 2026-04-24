import { prisma } from '@/lib/db/prisma';
import { createSupabaseServerClient } from '@/lib/auth/supabase';

type SessionUser = {
  id: string;
  supabaseUserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'ADMIN' | 'USER';
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function getSuperAdminEmail() {
  const configuredEmail =
    process.env.SUPER_ADMIN_EMAIL ??
    process.env.ADMIN_EMAIL ??
    process.env.ADMIN_EMAILS?.split(',')[0];

  return configuredEmail?.trim().toLowerCase() || null;
}

function getRoleForEmail(email: string): 'ADMIN' | 'USER' {
  return email.toLowerCase() === getSuperAdminEmail() ? 'ADMIN' : 'USER';
}

function isPrismaDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'PrismaClientInitializationError' ||
    error.message.includes('Authentication failed against database server') ||
    error.message.includes('did not initialize yet')
  );
}

const sessionCache = new Map<string, { user: SessionUser; expiresAt: number }>();

const CACHE_TTL_MS = 30_000;

function getCachedUser(supabaseUserId: string): SessionUser | null {
  const cached = sessionCache.get(supabaseUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  sessionCache.delete(supabaseUserId);
  return null;
}

function setCachedUser(supabaseUserId: string, user: SessionUser) {
  sessionCache.set(supabaseUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
}

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AuthError('Authentication required');
  }

  const authUser = data.user;
  const cachedUser = getCachedUser(authUser.id);
  if (cachedUser) {
    return cachedUser;
  }

  try {
    if (!authUser.email) {
      throw new AuthError('Supabase user email is required');
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    });

    if (!user) {
      const newUser = await prisma.user.create({
        data: {
          supabaseUserId: authUser.id,
          email: authUser.email,
          fullName: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
          role: getRoleForEmail(authUser.email),
        },
      });
      setCachedUser(authUser.id, newUser);
      return newUser;
    }

    if (
      user.email !== authUser.email ||
      user.fullName !== (authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null) ||
      user.avatarUrl !== (authUser.user_metadata?.avatar_url ?? null)
    ) {
      const updatedUser = await prisma.user.update({
        where: { supabaseUserId: authUser.id },
        data: {
          email: authUser.email,
          fullName: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
          role: getRoleForEmail(authUser.email),
        },
      });
      setCachedUser(authUser.id, updatedUser);
      return updatedUser;
    }

    setCachedUser(authUser.id, user);
    return user;
  } catch (error) {
    if (isPrismaDatabaseError(error)) {
      const fallback = {
        id: authUser.id,
        supabaseUserId: authUser.id,
        email: authUser.email ?? '',
        fullName:
          typeof authUser.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : typeof authUser.user_metadata?.name === 'string'
              ? authUser.user_metadata.name
              : null,
        avatarUrl: typeof authUser.user_metadata?.avatar_url === 'string' ? authUser.user_metadata.avatar_url : null,
        role: getRoleForEmail(authUser.email ?? ''),
        isPremium: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCachedUser(authUser.id, fallback);
      return fallback;
    }

    throw error;
  }
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();

  if (user.role !== 'ADMIN' || getRoleForEmail(user.email) !== 'ADMIN') {
    throw new AuthError('Admin access required', 403);
  }

  return user;
}
