'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { SupabaseClient, User } from '@supabase/supabase-js';

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

  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    cachedSession = { status: 'guest' };
    sessionLoaded = true;
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
    // Fall through to guest
  }

  const role = session.user.email?.toLowerCase() === 'admin@financeprep.com' ? 'ADMIN' : 'USER';
  cachedSession = {
    status: 'authenticated',
    role,
    email: session.user.email || '',
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

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const newSession = await fetchSession(supabase);
      if (isMounted) {
        setSession(newSession);
      }
    }

    void loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        cachedSession = null;
        sessionLoaded = false;
        if (isMounted) {
          setSession({ status: 'guest' });
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          cachedSession = null;
          sessionLoaded = false;
        }
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
              { href: '/user', label: 'Dashboard' },
              { href: '/user/quiz', label: 'Quiz Center' },
            ]
        : [
            { href: '/', label: 'Home' },
            { href: '/sign-in', label: 'Sign in' },
            { href: '/sign-up', label: 'Create account' },
          ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight text-zinc-950">
          Finance Prep
        </Link>

        <nav className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
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
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
