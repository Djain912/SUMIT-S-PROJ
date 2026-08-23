'use client';

import { useEffect, useState } from 'react';

export function ReadingProgressBar() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setPct(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-zinc-100">
      <div
        className="h-full bg-[#1e3a5f] transition-[width] duration-75 ease-linear rounded-r-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
