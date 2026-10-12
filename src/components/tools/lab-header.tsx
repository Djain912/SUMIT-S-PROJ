import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft } from 'lucide-react';

export function LabHeader({ backToLab = false }: { backToLab?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#FAFAF8]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center">
            <Image src="/chartix-wordmark.png" alt="Chartix" width={108} height={28} priority />
          </Link>
          {backToLab && (
            <Link href="/tools" className="hidden items-center gap-1 text-[13px] text-stone-500 transition hover:text-stone-900 sm:inline-flex">
              <ChevronLeft className="h-3.5 w-3.5" /> Indicator Lab
            </Link>
          )}
        </div>
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="hidden text-[13px] text-stone-600 transition hover:text-stone-900 sm:block">Log in</Link>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-emerald-900">
            Enroll free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LabFooter() {
  return (
    <footer className="border-t border-stone-200 py-8 text-center text-xs text-stone-400">
      © {new Date().getFullYear()} Chartix ·{' '}
      <Link href="/" className="hover:text-stone-700">Home</Link> ·{' '}
      <Link href="/pricing" className="hover:text-stone-700">Pricing</Link> ·{' '}
      <Link href="/sign-up" className="hover:text-stone-700">Sign up</Link>
    </footer>
  );
}

export function LabCta() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center sm:px-12">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-800">CMT exam prep</p>
      <h2 className="mx-auto mt-3 max-w-xl font-serif text-3xl leading-tight text-stone-900 sm:text-[34px]">
        Ready to go beyond the calculator?
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-stone-500">
        Chartix has full CMT notes, 10,000+ exam-level MCQs, mock tests and the Chartix Scholar — for all three levels.
      </p>
      <Link href="/sign-up" className="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-7 py-3 text-sm font-medium text-white transition hover:bg-emerald-900">
        Start free — no card needed <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
