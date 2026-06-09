'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Menu, X, LayoutDashboard, Brain, BarChart3, Shield, Infinity as InfinityIcon, Crown, Calendar, Clock, BookOpen, LogOut, ChevronDown } from 'lucide-react';

type Access = {
  isPremium: boolean;
  premiumUntil: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  active: boolean;
} | null;

type Props = {
  isLoggedIn: boolean;
  role: string | null;
  userName: string | null;
  userEmail?: string | null;
  access?: Access;
};

// Derive a friendly access summary from the raw access record.
function describeAccess(access: Access): { badge: string; tone: string; status: string; daysLeft: number | null } {
  if (!access) return { badge: 'Free', tone: 'bg-zinc-100 text-zinc-500', status: 'No active plan', daysLeft: null };
  if (access.role === 'ADMIN') return { badge: 'Admin', tone: 'bg-red-50 text-red-600', status: 'Full admin access', daysLeft: null };
  if (access.isPremium && !access.premiumUntil) return { badge: 'Lifetime', tone: 'bg-violet-50 text-violet-700', status: 'Lifetime access — never expires', daysLeft: null };
  if (access.isPremium && access.premiumUntil) {
    const until = new Date(access.premiumUntil);
    const now = new Date();
    if (until > now) {
      const daysLeft = Math.ceil((until.getTime() - now.getTime()) / 86_400_000);
      return {
        badge: 'Premium',
        tone: 'bg-amber-50 text-amber-600',
        status: `Active until ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        daysLeft,
      };
    }
    return { badge: 'Expired', tone: 'bg-zinc-100 text-zinc-400', status: `Expired on ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, daysLeft: null };
  }
  return { badge: 'Free', tone: 'bg-zinc-100 text-zinc-500', status: 'No active plan', daysLeft: null };
}

export function AppNavbarClient({ isLoggedIn, role, userName, userEmail, access }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account dropdown when clicking outside it.
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  // Pages that have their own embedded navbar — suppress the global one
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname === '/' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/tools') ||
    pathname === '/pricing' ||
    pathname === '/disclaimer' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms' ||
    pathname === '/refund-policy'
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
          <Image src="/chartix-icon.png" alt="Chartix logo" width={28} height={28} priority />
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
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-zinc-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                  {initials}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountOpen && (() => {
                const acc = describeAccess(access ?? null);
                return (
                  <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                    {/* Identity header */}
                    <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{userName ?? 'Your account'}</p>
                        {userEmail && <p className="truncate text-xs text-zinc-500">{userEmail}</p>}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 px-4 py-3.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Account</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${acc.tone}`}>
                          {acc.badge === 'Admin' && <Shield className="h-3 w-3" />}
                          {acc.badge === 'Lifetime' && <InfinityIcon className="h-3 w-3" />}
                          {acc.badge === 'Premium' && <Crown className="h-3 w-3" />}
                          {acc.badge}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><Clock className="h-3.5 w-3.5" /> Access</span>
                        <span className="text-right text-xs font-medium text-zinc-700">
                          {acc.status}
                          {acc.daysLeft !== null && (
                            <span className="mt-0.5 block text-[11px] font-semibold text-amber-600">{acc.daysLeft} day{acc.daysLeft === 1 ? '' : 's'} left</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><BookOpen className="h-3.5 w-3.5" /> Level</span>
                        <span className="text-right text-xs font-medium text-zinc-700">
                          CMT Level I
                          <span className="mt-0.5 block text-[11px] text-zinc-400">Level II &amp; III coming soon</span>
                        </span>
                      </div>

                      {access?.createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-zinc-500"><Calendar className="h-3.5 w-3.5" /> Member since</span>
                          <span className="text-xs font-medium text-zinc-700">
                            {new Date(access.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-zinc-100 p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
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
              (() => {
                const acc = describeAccess(access ?? null);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800">{userName}</p>
                        {userEmail && <p className="truncate text-xs text-zinc-500">{userEmail}</p>}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Account</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${acc.tone}`}>{acc.badge}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-zinc-500">Access</span>
                        <span className="font-medium text-zinc-700">{acc.status}{acc.daysLeft !== null ? ` (${acc.daysLeft}d left)` : ''}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-zinc-500">Level</span>
                        <span className="font-medium text-zinc-700">CMT Level I</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                );
              })()
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
