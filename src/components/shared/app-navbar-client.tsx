'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { TrendingUp, Menu, X, LayoutDashboard, Brain, BarChart3 } from 'lucide-react';

type Props = {
  isLoggedIn: boolean;
  role: string | null;
  userName: string | null;
};

export function AppNavbarClient({ isLoggedIn, role, userName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Pages that have their own embedded navbar — suppress the global one
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname === '/' ||
    pathname.startsWith('/blog') ||
    pathname === '/pricing'
  ) {
    return null;
  }

  const isAdmin = role === 'ADMIN';

  const navLinks: { href: string; label: string; icon: React.ElementType | null }[] = !isLoggedIn
    ? [
        { href: '/', label: 'Home', icon: null },
        { href: '/about', label: 'About', icon: null },
      ]
    : isAdmin
      ? [{ href: '/admin', label: 'Console', icon: null }]
      : [
          { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/user/quiz', label: 'Quiz', icon: Brain },
          { href: '/user/analytics', label: 'Analytics', icon: BarChart3 },
        ];

  const handleLogout = async () => {
    setOpen(false);
    await signOut({ redirectTo: '/' });
  };

  const initials = userName
    ? userName.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' :
    href === '/user' ? pathname === '/user' :
    pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href={isLoggedIn && !isAdmin ? '/user' : '/'}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden text-sm font-bold tracking-tight text-zinc-950 sm:block font-heading">
            Chartix
          </span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-emerald-700 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right side */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          {isLoggedIn ? (
            <>
              <div
                title={userName ?? undefined}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white"
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
                className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
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
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'bg-emerald-700 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-zinc-100 px-4 py-3">
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
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
                  className="rounded-full bg-emerald-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-600"
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
