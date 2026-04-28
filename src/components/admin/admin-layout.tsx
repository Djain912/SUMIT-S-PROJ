"use client";

import { useState } from 'react';
import Link from 'next/link';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const levels: Level[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

type Tab = 'dashboard' | 'chapters' | 'subtopics' | 'notes' | 'questions';

const tabs: { id: Tab; label: string; href: string }[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin' },
  { id: 'chapters', label: 'Chapters', href: '/admin/chapters' },
  { id: 'subtopics', label: 'Subtopics', href: '/admin/subtopics' },
  { id: 'notes', label: 'Notes', href: '/admin/notes' },
  { id: 'questions', label: 'Questions', href: '/admin/questions' },
];

export function AdminLayout() {
  const [selectedLevel, setSelectedLevel] = useState<Level>('LEVEL_1');
  const activeTab: Tab = 'dashboard';

  const currentLevelData = {
    LEVEL_1: { chapters: 0, subtopics: 0, notes: 0, questions: 0 },
    LEVEL_2: { chapters: 0, subtopics: 0, notes: 0, questions: 0 },
    LEVEL_3: { chapters: 0, subtopics: 0, notes: 0, questions: 0 },
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold text-zinc-900">
              Admin
            </Link>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as Level)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium"
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex h-12 items-center gap-1 border-t border-zinc-100 px-4">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 border-r border-zinc-200 bg-white py-4 lg:block">
          <nav className="space-y-1 px-2">
            <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              {selectedLevel.replace('_', ' ')}
            </p>
            {tabs.slice(1).map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {tab.label}
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  {currentLevelData[selectedLevel][tab.id as keyof typeof currentLevelData[typeof selectedLevel]]}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">{/* Page content renders here */}</main>
      </div>
    </div>
  );
}
