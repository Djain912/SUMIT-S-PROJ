import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ArrowRight, ChevronLeft } from 'lucide-react';
import { IndicatorTool, type IndicatorKey } from '@/components/tools/indicator-tool';

export const dynamic = 'force-dynamic';

const VALID: IndicatorKey[] = ['roc', 'macd', 'rsi', 'stochastics', 'adl', 'mfi', 'ppo', 'dmi', 'obv', 'cmf', 'rvol', 'sma', 'ema', 'lwma', 'wilderma', 'distma', 'bb'];
const NAMES: Record<IndicatorKey, string> = {
  roc: 'Rate of Change (ROC)', macd: 'MACD', rsi: 'RSI', stochastics: 'Stochastics',
  adl: 'Accumulation / Distribution', mfi: 'Money Flow Index', ppo: 'PPO', dmi: 'DMI / ADX',
  obv: 'On Balance Volume', cmf: 'Chaikin Money Flow', rvol: 'Relative Volume',
  sma: 'Simple Moving Average', ema: 'Exponential Moving Average',
  lwma: 'Linearly Weighted Moving Average', wilderma: 'Wilder Moving Average', distma: 'Distance from MA (%)',
  bb: 'Bollinger Bands®',
};

export async function generateMetadata({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  const name = NAMES[indicator as IndicatorKey] ?? 'Indicator';
  return {
    title: `${name} Calculator — Free Interactive Tool | Chartix Indicator Lab`,
    description: `Free interactive ${name} calculator with a live price chart, step-by-step calculation table, and a clear explanation. Learn exactly how ${name} is built.`,
  };
}

export default async function PublicIndicatorPage({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  if (!VALID.includes(indicator as IndicatorKey)) notFound();
  const key = indicator as IndicatorKey;

  return (
    <div className="min-h-screen bg-zinc-50/50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-700 transition">
              <ChevronLeft className="h-4 w-4" /> All Tools
            </Link>
            <span className="text-zinc-200">|</span>
            <Link href="/" className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-emerald-900">Chartix</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden text-sm font-medium text-zinc-500 hover:text-emerald-700 transition sm:block">
              Log In
            </Link>
            <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              Enroll Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <IndicatorTool indicator={key} />

        {/* Sign-up nudge */}
        <div className="mt-10 rounded-2xl bg-emerald-900 px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">CMT Exam Prep</p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Want notes, quizzes & the Chartix Scholar too?
          </h2>
          <p className="mt-2 text-sm text-emerald-300">
            Chartix has chapter-wise CMT notes, 2000+ practice MCQs, mock tests and the Chartix Scholar — all in one place.
          </p>
          <Link href="/sign-up" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition">
            Start free — no card needed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="mt-10 border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Chartix · <Link href="/" className="hover:text-emerald-700">Home</Link> · <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link> · <Link href="/sign-up" className="hover:text-emerald-700">Sign Up</Link>
      </footer>
    </div>
  );
}
