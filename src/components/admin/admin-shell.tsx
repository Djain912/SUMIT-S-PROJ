"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, BookOpen, FileText, ListChecks, Flag, ShieldCheck, Menu, X, LogOut, MessageSquare, Bot, Globe, ThumbsUp, Newspaper, Users, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const levels: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Chapters', href: '/admin/chapters', icon: BookOpen },
  { label: 'Subtopics', href: '/admin/subtopics', icon: FileText },
  { label: 'Notes', href: '/admin/notes', icon: FileText },
  { label: 'Practice Tools', href: '/admin/tools', icon: LineChart },
  { label: 'Questions', href: '/admin/questions', icon: ListChecks },
  { label: 'Question Reports', href: '/admin/question-reports', icon: Flag },
  { label: 'Note Reports', href: '/admin/note-reports', icon: ShieldCheck },
  { label: 'Contact Messages', href: '/admin/contacts', icon: MessageSquare },
  { label: 'Scholar Training', href: '/admin/chatbot', icon: Bot },
  { label: 'Homepage Bot', href: '/admin/homepage-bot', icon: Globe },
  { label: 'Bot Feedback', href: '/admin/bot-feedback', icon: ThumbsUp },
  { label: 'Blog', href: '/admin/blog', icon: Newspaper },
  { label: 'Users / Leads', href: '/admin/users', icon: Users },
];

function getSelectedLevel(level: string | null): Level {
  return levels.includes(level as Level) ? (level as Level) : 'LEVEL_1';
}

function formatLevel(level: Level): string {
  return level.replace('_', ' ');
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLevel = getSelectedLevel(searchParams.get('level'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function getHref(href: string, level = selectedLevel) {
    const params = new URLSearchParams(searchParams);
    params.set('level', level);
    return `${href}?${params.toString()}`;
  }

  const handleNavClick = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_28%),#f7f9fc]">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-3 top-3 z-50 flex items-center justify-center rounded-lg bg-white p-2 shadow-lg border border-zinc-200 lg:hidden"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-zinc-600" />
        ) : (
          <Menu className="h-5 w-5 text-zinc-600" />
        )}
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform bg-white/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:border-r lg:border-zinc-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-100 px-4 py-4 lg:px-5 lg:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Admin</p>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight text-zinc-950">
              Content Studio
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Manage content & reports
            </p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={getHref(item.href)}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-zinc-100 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Level</p>
            <div className="flex rounded-lg bg-zinc-100 p-1">
              {levels.map((level) => (
                <Link
                  key={level}
                  href={getHref(pathname, level)}
                  onClick={handleNavClick}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition',
                    selectedLevel === level
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900'
                  )}
                >
                  {formatLevel(level)}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-5 lg:px-6 lg:py-7">{children}</div>
      </main>
    </div>
  );
}
