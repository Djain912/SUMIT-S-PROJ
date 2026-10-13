'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: [string, string][] = [
  ['/tools/fii-dii', 'Overview'],
  ['/tools/fii-dii/history', 'History'],
  ['/tools/fii-dii/fno', 'F&O positions'],
  ['/tools/fii-dii/sectors', 'Sectors'],
];

export function FiiNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-14 z-40 border-b border-stone-200 bg-[#FAFAF8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8">
        {TABS.map(([href, label]) => {
          const on = path === href;
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined}
              className={`-mb-px flex-none border-b-2 px-3 py-3.5 text-[14px] transition ${on ? 'border-emerald-800 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-stone-600">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />{label}
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-[12.5px] transition ${value === v ? 'bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200' : 'text-stone-500 hover:text-stone-900'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
