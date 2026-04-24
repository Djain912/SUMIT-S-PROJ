"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type AdminLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const levels: AdminLevel[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

type AdminLevelTabsProps = {
  selectedLevel: AdminLevel;
  onLevelChange?: (level: AdminLevel) => void;
};

export function AdminLevelTabs({ selectedLevel, onLevelChange }: AdminLevelTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectLevel(level: AdminLevel) {
    onLevelChange?.(level);

    const params = new URLSearchParams(searchParams);
    params.set('level', level);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-sm sm:w-fit">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => selectLevel(level)}
          className={`min-w-24 rounded-md px-4 py-2 text-sm font-semibold transition ${
            selectedLevel === level
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          }`}
        >
          {level.replace('_', ' ').replace('LEVEL', 'Level')}
        </button>
      ))}
    </div>
  );
}
