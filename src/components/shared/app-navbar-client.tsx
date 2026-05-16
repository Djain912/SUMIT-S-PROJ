'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { CircleDollarSign, Menu, X } from 'lucide-react';

type Props = {
  isLoggedIn: boolean;
  role: string | null;
  userName: string | null;
};

export function AppNavbarClient({ isLoggedIn, role }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide on admin pages (own sidebar) and auth pages
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up')
  ) {
    return null;
  }

  const isAdmin = role === 'ADMIN';

  const links = !isLoggedIn
    ? [
        { href: '/', label: 'Home' },
        { href: '/sign-in', label: 'Sign in' },
        { href: '/sign-up', label: 'Sign up' },
      ]
    : isAdmin
      ? [
          { href: '/', label: 'Home' },
          { href: '/admin', label: 'Admin Console' },
        ]
      : [
          { href: '/', label: 'Home' },
          { href: '/user', label: 'Chapters' },
          { href: '/user/quiz', label: 'Quiz' },
          { href: '/user/analytics', label: 'Analytics' },
        ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition lg:px-3.5 lg:text-sm ${
                pathname === link.href
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-50 lg:px-3.5 lg:text-sm"
            >
              Logout
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-center rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 md:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-100 bg-white md:hidden">
          <nav className="flex flex-col gap-1 px-3 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  pathname === link.href
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="mt-2 w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-center text-sm font-medium text-orange-700 transition hover:bg-orange-100"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
