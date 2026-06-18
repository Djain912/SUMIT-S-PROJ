import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Scale, BarChart3, Download, Rocket } from 'lucide-react';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Custom Index Builder — Build Market-Cap & Equal-Weight Indices | Chartix',
  description:
    'Free tool to build your own custom stock index from 4,900+ NSE/BSE stocks. Choose market-cap or equal weighting, set a base value and date range, and chart your index with indicators — no login required.',
  alternates: { canonical: '/tools/index-builder' },
  openGraph: {
    title: 'Custom Index Builder — Chartix',
    description:
      'Build and chart your own market-cap or equal-weighted stock index from 4,900+ Indian stocks. Free, no login.',
    url: '/tools/index-builder',
  },
};

// The actual interactive tool (self-contained app served from /public).
const APP_URL = '/index-builder-app/index.html?v=10';

const features = [
  { icon: BookOpen, title: '4,900+ NSE/BSE stocks', desc: 'Search any listed Indian stock by name or symbol and add it to your index.' },
  { icon: Scale, title: 'Market-cap or equal weight', desc: 'Weight by company size, or give every stock an equal say — your choice.' },
  { icon: BarChart3, title: 'Charts, CAGR & drawdown', desc: 'Instant index chart with moving averages, RSI, MACD, and key performance stats.' },
  { icon: Download, title: 'Download your chart', desc: 'Export a clean PNG of your index, ready to share — watermarked with chartix.in.' },
];

const faqs = [
  {
    q: 'What is a custom index?',
    a: 'A custom index is a basket of stocks combined into a single benchmark whose value you can track over time. Instead of relying on a ready-made index like the Nifty 50 or Sensex, you choose the exact constituents and the weighting method to measure how that specific group of stocks has performed.',
  },
  {
    q: 'What is the difference between market-cap and equal weighting?',
    a: 'In a market-cap weighted index, larger companies (by market capitalisation = price × shares outstanding) have a bigger influence on the index value — this is how the Nifty 50 and most major indices work. In an equal-weighted index, every constituent counts the same regardless of size, so smaller stocks have just as much impact as larger ones.',
  },
  {
    q: 'Is the Index Builder free to use?',
    a: 'Yes. The Chartix Index Builder is completely free and requires no login or sign-up. Just add your stocks, pick a date range, and build your index.',
  },
  {
    q: 'Which stocks can I include?',
    a: 'You can build an index from over 4,900 NSE and BSE listed stocks. Start typing a company name or symbol and pick from the autocomplete list.',
  },
  {
    q: 'Where does the price data come from?',
    a: 'Historical price and shares-outstanding data is sourced from Yahoo Finance and is provided for educational and informational purposes only. It is not investment advice.',
  },
  {
    q: 'Can I download my index chart?',
    a: 'Yes. Use the PNG button to download your index chart as an image, ready to share on social media or include in a report.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Chartix Custom Index Builder',
  url: `${siteConfig.url}/tools/index-builder`,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description:
    'Free web tool to build market-cap or equal-weighted stock indices from 4,900+ NSE/BSE stocks, with charting, indicators and CAGR/drawdown stats.',
};

export default function IndexBuilderPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center">
            <Image src="/chartix-wordmark.png" alt="Chartix" width={132} height={34} priority />
          </Link>
          <a
            href={APP_URL}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Rocket className="h-4 w-4" /> Launch Builder
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Free Tool · No login
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-emerald-900 sm:text-5xl">
            Build Your Own Stock Index
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-zinc-500">
            Create a custom index from 4,900+ NSE/BSE stocks — pick market-cap or equal weighting, set a date range, and
            instantly chart how your basket would have performed.
          </p>

          {/* Highly-visible primary CTA */}
          <div className="mt-9 flex flex-col items-center gap-3">
            <a
              href={APP_URL}
              className="inline-flex items-center gap-2.5 rounded-full bg-emerald-600 px-9 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:scale-[1.02] hover:bg-emerald-700"
            >
              <Rocket className="h-5 w-5" /> Launch the Index Builder <ArrowRight className="h-5 w-5" />
            </a>
            <span className="text-xs text-zinc-400">Opens the live charting tool · 100% free</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,40,30,.04),0_8px_24px_rgba(16,40,30,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(16,40,30,.10)]">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 shadow-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-emerald-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Educational / SEO content */}
      <section className="border-t border-zinc-100 bg-zinc-50/50 py-16">
        <article className="mx-auto max-w-3xl px-5 text-zinc-700">
          <h2 className="text-2xl font-bold text-emerald-900">What is a custom index?</h2>
          <p className="mt-3 leading-7">
            A <strong>custom index</strong> is a basket of stocks combined into a single benchmark whose value you can
            track over time. Rather than relying on a ready-made index like the Nifty 50 or Sensex, you decide exactly
            which stocks go in and how they are weighted — useful for testing a theme or sector idea, comparing a model
            portfolio against the broad market, or understanding how weighting changes a benchmark&apos;s behaviour.
          </p>

          <h2 className="mt-10 text-2xl font-bold text-emerald-900">Market-cap vs. equal weighting</h2>
          <p className="mt-3 leading-7">
            In a <strong>market-cap weighted</strong> index, each stock&apos;s influence is proportional to its market
            capitalisation (price × shares outstanding) — so the largest companies move the index the most, as in the
            Nifty 50. In an <strong>equal-weighted</strong> index, every constituent carries the same weight regardless
            of size, giving smaller companies just as much say. Comparing the two for the same stocks reveals the effect
            of concentration in mega-cap names.
          </p>

          <h2 className="mt-10 text-2xl font-bold text-emerald-900">How to build an index</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7">
            <li>Click <strong>Launch the Index Builder</strong> above.</li>
            <li>Name your index and pick a start/end date and exchange (NSE / BSE).</li>
            <li>Choose a weighting method — market-cap or equal weight.</li>
            <li>Add 2 or more stocks (shares auto-fill for market-cap mode).</li>
            <li>Hit <strong>Build</strong> to chart your index, then add indicators or export a PNG.</li>
          </ol>

          <h2 className="mt-10 text-2xl font-bold text-emerald-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-zinc-900">{f.q}</h3>
                <p className="mt-1 leading-7 text-zinc-600">{f.a}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Closing CTA */}
      <section className="bg-emerald-900 py-14 text-center">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to build your index?</h2>
          <a
            href={APP_URL}
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-base font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            <Rocket className="h-5 w-5" /> Launch the Index Builder <ArrowRight className="h-5 w-5" />
          </a>
          <p className="mt-8 text-sm text-emerald-300">
            Preparing for the CMT exam?{' '}
            <Link href="/sign-up" className="font-semibold text-white underline">
              Start free with Chartix
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-100 bg-white py-8">
        <p className="mx-auto max-w-3xl px-5 text-center text-xs leading-6 text-zinc-400">
          Data from Yahoo Finance, for educational and informational purposes only — not investment advice.{' '}
          <Link href="/" className="text-emerald-600 hover:underline">
            Back to Chartix home
          </Link>
        </p>
      </footer>
    </div>
  );
}
