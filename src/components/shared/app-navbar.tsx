'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { CircleDollarSign, Menu, X } from 'lucide-react';

type SessionState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; role: 'ADMIN' | 'USER'; email: string };

let cachedSession: SessionState | null = null;
let sessionLoaded = false;

async function fetchSession(supabase: SupabaseClient): Promise<SessionState> {
  if (cachedSession && sessionLoaded) {
    return cachedSession;
  }

  try {
    const response = await fetch('/api/auth/session', { 
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const payload = await response.json();
      if (payload?.success) {
        cachedSession = {
          status: 'authenticated',
          role: payload.data.role,
          email: payload.data.email,
        };
        sessionLoaded = true;
        return cachedSession;
      }
    }
  } catch {
    // Fall through to direct auth lookup
  }

  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData.user) {
    cachedSession = { status: 'guest' };
    sessionLoaded = true;
    return cachedSession;
  }

  cachedSession = {
    status: 'authenticated',
    role: userData.user.email?.toLowerCase() === 'admin@financeprep.com' ? 'ADMIN' : 'USER',
    email: userData.user.email || '',
  };
  sessionLoaded = true;
  return cachedSession;
}

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(() => {
    if (cachedSession && sessionLoaded) {
      return cachedSession;
    }
    return { status: 'loading' };
  });
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const newSession = await fetchSession(supabase);
      if (isMounted) {
        setSession(newSession);
      }
    }

    void loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        cachedSession = null;
        sessionLoaded = false;
        if (isMounted) {
          setSession({ status: 'guest' });
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        cachedSession = null;
        sessionLoaded = false;
        void loadSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    cachedSession = null;
    sessionLoaded = false;
    await supabase.auth.signOut();
    setSession({ status: 'guest' });
    router.push('/');
    router.refresh();
  }, [supabase, router]);

  const links =
    session.status === 'loading'
      ? [{ href: '/', label: 'Home' }]
      : session.status === 'authenticated'
        ? session.role === 'ADMIN'
          ? [
              { href: '/', label: 'Home' },
              { href: '/admin', label: 'Admin Console' },
            ]
          : [
              { href: '/', label: 'Home' },
              { href: '/user', label: 'Chapters' },
              { href: '/user/quiz', label: 'Quiz' },
              { href: '/user/analytics', label: 'Analytics' },
            ]
        : [
            { href: '/', label: 'Home' },
            { href: '/sign-in', label: 'Sign in' },
            { href: '/sign-up', label: 'Sign up' },
          ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-3 sm:px-4 lg:px-5">
        <Link 
          href="/" 
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
            <CircleDollarSign className="h-3.5 w-3.5" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block lg:text-base">
            Finance Prep
          </span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1 lg:gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition lg:px-3.5 lg:text-sm ${
                  isActive
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {session.status === 'authenticated' ? (
            <button
              type="button"
              onClick={handleLogout}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-50 lg:px-3.5 lg:text-sm"
            >
              Logout
            </button>
          ) : null}
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-center rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-100 bg-white md:hidden">
          <nav className="flex flex-col gap-1 px-3 py-3">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {session.status === 'authenticated' ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="mt-2 w-full whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-center text-sm font-medium text-orange-700 transition hover:bg-orange-100"
              >
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
