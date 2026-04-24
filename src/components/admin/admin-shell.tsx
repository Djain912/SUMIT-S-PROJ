"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const levels: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

const tabs = [
  { label: 'Overview', href: '/admin' },
  { label: 'Chapters', href: '/admin/chapters' },
  { label: 'Subtopics', href: '/admin/subtopics' },
  { label: 'Notes', href: '/admin/notes' },
  { label: 'Question Bank', href: '/admin/questions' },
];

function getSelectedLevel(level: string | null): Level {
  return levels.includes(level as Level) ? (level as Level) : 'LEVEL_1';
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedLevel = getSelectedLevel(searchParams.get('level'));

  function getHref(href: string, level = selectedLevel) {
    const params = new URLSearchParams(searchParams);
    params.set('level', level);
    return `${href}?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Admin Console
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                Learning Content Studio
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-500">
              Organize the curriculum, study notes, and assessments that power the learner experience.
            </p>
          </div>

          <nav className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={getHref(tab.href)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-zinc-500 hover:bg-white hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
