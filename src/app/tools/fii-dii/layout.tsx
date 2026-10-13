import Link from 'next/link';
import { LabHeader, LabFooter } from '@/components/tools/lab-header';
import { FiiNav } from '@/components/fii-dii/shell';
import { ScrollPopup } from '@/components/marketing/ScrollPopup';
import { IndexBuilderTimedBanner } from '@/components/marketing/IndexBuilderTimedBanner';

export default function FiiDiiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-900">
      <LabHeader />
      <FiiNav />
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {children}
        <p className="mt-20 border-t border-stone-200 pt-6 text-[12.5px] leading-relaxed text-stone-400">
          Cash and F&amp;O data from{' '}
          <a href="https://www.nseindia.com/reports-indices-fii-dii-trading-activity" target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 underline-offset-2 hover:text-stone-700">NSE</a>;
          sector data from the{' '}
          <a href="https://www.fpi.nsdl.co.in" target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 underline-offset-2 hover:text-stone-700">NSDL FPI Monitor</a>{' '}
          via the open dataset by{' '}
          <a href="https://twitter.com/mr_chartist" target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 underline-offset-2 hover:text-stone-700">Mr. Chartist</a>{' '}
          (MIT License). For education and information only — not investment advice.{' '}
          <Link href="/tools" className="underline decoration-stone-300 underline-offset-2 hover:text-stone-700">More free tools</Link>
        </p>
      </main>
      <LabFooter />
      <ScrollPopup triggerPct={20} />
      <IndexBuilderTimedBanner />
    </div>
  );
}
