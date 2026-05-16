'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { TrendingUp, Menu, X } from 'lucide-react';

type Props = {
  isLoggedIn: boolean;
  role: string | null;
  userName: string | null;
};

export function AppNavbarClient({ isLoggedIn, role, userName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up')
  ) {
    return null;
  }

  const isAdmin = role === 'ADMIN';

  const navLinks = !isLoggedIn
    ? [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
      ]
    : isAdmin
      ? [{ href: '/admin', label: 'Console' }]
      : [
          { href: '/user', label: 'Dashboard' },
          { href: '/user/quiz', label: 'Quiz' },
          { href: '/user/analytics', label: 'Analytics' },
        ];

  const handleLogout = async () => {
    setOpen(false);
    await signOut({ redirectTo: '/' });
  };

  const initials = userName
    ? userName.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href={isLoggedIn && !isAdmin ? '/user' : '/'}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden text-sm font-bold tracking-tight text-zinc-950 sm:block">
            CMT Prep
          </span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          {isLoggedIn ? (
            <>
              <div
                title={userName ?? undefined}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ml-auto flex items-center justify-center rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-zinc-100 bg-white md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(link.href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-4 py-3">
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-zinc-700 truncate max-w-[160px]">{userName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Get started free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
