import type { ReactNode } from 'react';

export function PageIntro({ eyebrow, title, children, meta }: { eyebrow: string; title: string; children?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="pb-10 pt-12 sm:pt-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800">{eyebrow}</p>
      <h1 className="mt-4 max-w-4xl font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.01em] text-stone-900 sm:text-[54px]">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-stone-500">{children}</div>}
      {meta && <div className="mt-6 text-[13px] text-stone-400">{meta}</div>}
    </header>
  );
}

export function Block({ title, lead, children, aside }: { title: string; lead?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-stone-200 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[28px] font-normal leading-tight text-stone-900">{title}</h2>
          {lead && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-500">{lead}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function Panel({ children, className = '', mark = false, id }: { children: ReactNode; className?: string; mark?: boolean; id?: string }) {
  return (
    <div id={id} className={`rounded-2xl border border-stone-200 bg-white ${mark ? 'relative' : ''} ${className}`}>
      {children}
      {mark && <BrandTag />}
    </div>
  );
}

/** Small source tag so screenshots of stat panels carry the Chartix name. */
export function BrandTag({ className = 'bottom-3 right-4' }: { className?: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute select-none text-[10.5px] font-medium tracking-[0.04em] text-stone-400 ${className}`}>
      chartix.in
    </span>
  );
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400 ${className}`}>{children}</p>;
}
