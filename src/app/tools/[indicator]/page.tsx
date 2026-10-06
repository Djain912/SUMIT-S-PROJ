import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { type IndicatorKey } from '@/components/tools/indicator-tool';
import { IndicatorLab } from '@/components/tools/indicator-lab';
import { ScrollPopup } from '@/components/marketing/ScrollPopup';

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

// Short descriptions for the intro paragraph shown below H1
const INTROS: Partial<Record<IndicatorKey, string>> = {
  rsi:        'Enter any price series and the tool calculates RSI step-by-step — average gain, average loss, RS ratio, and the final oscillator value — with a live chart overlay.',
  macd:       'See exactly how MACD is built: the 12-period EMA, 26-period EMA, the signal line, and the histogram — calculated live from the price data you enter.',
  bb:         'Calculates the middle band (SMA), upper band (+2σ), and lower band (−2σ) in real time. Adjust the period and standard-deviation multiplier to see how the bands react.',
  sma:        'Enter price data and period — the tool shows each SMA value with its component prices highlighted, making the rolling-average mechanic immediately visible.',
  ema:        'See how EMA weights recent prices more heavily than SMA: the tool shows the smoothing factor, each period\'s calculation, and the EMA plotted against price.',
  dmi:        'Calculates +DI, −DI, and the ADX trend-strength line together. A great way to understand how directional movement converts into a single trend reading.',
  stochastics:'Shows the %K and %D lines with the 80/20 overbought-oversold zones marked — calculated from the highest high and lowest low over your chosen look-back.',
  obv:        'Running total of volume with sign: adds volume on up days, subtracts on down days. A pure cumulative measure of buying and selling pressure.',
};

export async function generateMetadata({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  const name = NAMES[indicator as IndicatorKey] ?? 'Indicator';
  const title = `${name} Calculator — Free Online Tool | Chartix`;
  const description = `Free online ${name} calculator with a live price chart, step-by-step calculation table, and a plain-English explanation. Understand exactly how ${name} works — no login required.`;
  return {
    title,
    description,
    keywords: [`${name} calculator`, `${name} online`, `${name} formula`, `CMT ${name}`, 'technical analysis calculator'],
    alternates: { canonical: `/tools/${indicator}` },
    openGraph: {
      title,
      description,
      url: `/tools/${indicator}`,
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
    },
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
            <Link href="/">
              <Image src="/chartix-wordmark.png" alt="Chartix" width={110} height={28} priority />
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
        {/* Visible H1 for SEO — Google needs a heading it can read on the page, not just in <title> */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            {NAMES[key]} Calculator
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {INTROS[key] ?? `Free online ${NAMES[key]} calculator with a live chart, step-by-step calculation table, and a plain-English explanation.`}
          </p>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: `${NAMES[key]} Calculator`,
              url: `https://chartix.in/tools/${key}`,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              description: `Free online ${NAMES[key]} calculator with a live price chart, step-by-step calculation table, and plain-English explanation. No login required.`,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />

        <IndicatorLab indicator={key} />

        {/* Sign-up nudge */}
        <div className="mt-10 rounded-2xl bg-emerald-900 px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">CMT Exam Prep</p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Want notes, quizzes & the Chartix Scholar too?
          </h2>
          <p className="mt-2 text-sm text-emerald-300">
            Chartix has chapter-wise CMT notes, 10,000+ practice MCQs, mock tests and the Chartix Scholar — all in one place.
          </p>
          <Link href="/sign-up" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition">
            Start free — no card needed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="mt-10 border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Chartix · <Link href="/" className="hover:text-emerald-700">Home</Link> · <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link> · <Link href="/sign-up" className="hover:text-emerald-700">Sign Up</Link>
      </footer>

      <ScrollPopup />
    </div>
  );
}
