import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

function getSuperAdminEmail(): string | null {
  const raw =
    process.env.SUPER_ADMIN_EMAIL ??
    process.env.ADMIN_EMAIL ??
    process.env.ADMIN_EMAILS?.split(',')[0];
  return raw?.trim().toLowerCase() ?? null;
}

function getRoleForEmail(email: string): 'ADMIN' | 'USER' {
  const adminEmail = getSuperAdminEmail();
  return adminEmail && email.toLowerCase() === adminEmail ? 'ADMIN' : 'USER';
}

async function upsertOAuthUser(email: string, providerAccountId: string, fullName: string | null, avatarUrl: string | null) {
  const role = getRoleForEmail(email);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { email },
      data: { providerAccountId, fullName: fullName ?? existing.fullName, avatarUrl: avatarUrl ?? existing.avatarUrl, role },
    });
  }

  return prisma.user.create({
    data: { providerAccountId, email, fullName, avatarUrl, role },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Throttle password guessing: per-IP and per-target-account
        try {
          const [byIp, byEmail] = await Promise.all([
            // Generous per-IP cap: many students can share one network (campus
            // wifi) — the per-email limit below is the precise brake.
            enforceRateLimit({ request, key: 'auth-login-ip', maxRequests: 40, windowMs: 15 * 60 * 1000 }),
            enforceRateLimit({ request, key: 'auth-login-email', maxRequests: 15, windowMs: 15 * 60 * 1000, identifier: email }),
          ]);
          if (!byIp.allowed || !byEmail.allowed) return null;
        } catch {
          // Rate limiter outage must not lock everyone out
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, fullName: true, avatarUrl: true, passwordHash: true, providerAccountId: true },
        });

        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.providerAccountId, email: user.email, name: user.fullName, image: user.avatarUrl };
      },
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      // Extract real destination from ?next= params set by our middleware
      try {
        const parsed = new URL(url, baseUrl);
        const next = parsed.searchParams.get('next');
        if (next?.startsWith('/') && !next.startsWith('/sign-in') && !next.startsWith('/admin/login')) {
          return `${baseUrl}${next}`;
        }
      } catch {
        // ignore invalid URLs
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // ignore
      }
      return baseUrl;
    },

    async signIn({ user, account }) {
      // Credentials: authorize() already validated
      if (!account || account.type === 'credentials') return true;

      // OAuth: must have email
      if (!user.email) return false;

      try {
        const sub = account.providerAccountId ?? account.sub ?? user.id ?? user.email;
        const providerAccountId = `${account.provider}:${sub}`;
        await upsertOAuthUser(user.email, providerAccountId, user.name ?? null, user.image ?? null);
        console.log(`[NextAuth] signIn OK — ${user.email} → ${providerAccountId}`);
        return true;
      } catch (err) {
        console.error('[NextAuth] signIn upsert failed:', err);
        // Still return true so user isn't blocked — JWT callback will handle missing DB row gracefully
        return true;
      }
    },

    async jwt({ token, user, account }) {
      // First sign-in: account is present, fetch DB user and store in token
      if (account && user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true, isPremium: true, providerAccountId: true },
          });
          console.log(`[NextAuth] jwt first sign-in for ${user.email}:`, dbUser?.id, dbUser?.role);
          token.dbId = dbUser?.id ?? null;
          token.role = dbUser?.role ?? getRoleForEmail(user.email);
          token.isPremium = dbUser?.isPremium ?? false;
          token.providerAccountId = dbUser?.providerAccountId ?? null;
        } catch (err) {
          console.error('[NextAuth] jwt DB lookup failed:', err);
          token.role = getRoleForEmail(user.email);
          token.isPremium = false;
        }
      }
      // Subsequent requests: token already has dbId/role from first sign-in — just return it
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbId as string;
        session.user.role = (token.role as 'ADMIN' | 'USER') ?? 'USER';
        session.user.isPremium = (token.isPremium as boolean) ?? false;
        session.user.providerAccountId = token.providerAccountId as string;
        console.log(`[NextAuth] session built — id:${token.dbId} role:${token.role} email:${session.user.email}`);
      }
      return session;
    },
  },

  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },

  session: { strategy: 'jwt' },
  trustHost: true,
});
