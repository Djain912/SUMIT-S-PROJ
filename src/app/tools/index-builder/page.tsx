import type { Metadata } from 'next';
import Link from 'next/link';
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
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* The interactive tool fills the first screen */}
      <iframe
        src="/index-builder-app/index.html"
        title="Chartix Custom Index Builder"
        className="block h-screen w-full border-0"
      />

      {/* ── SEO / educational content below the tool ── */}
      <article className="mx-auto max-w-3xl px-5 py-16 text-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Free Tool</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-900 sm:text-4xl">
          Custom Index Builder — Build Your Own Stock Index
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          The Chartix Custom Index Builder lets you create your own stock market index from{' '}
          <strong>4,900+ NSE and BSE stocks</strong> — free and with no login. Pick your constituents, choose{' '}
          <strong>market-cap</strong> or <strong>equal weighting</strong>, set a base value and date range, and instantly
          chart how your index would have performed, complete with CAGR, maximum drawdown, volatility and technical
          indicators.
        </p>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">What is a custom index?</h2>
        <p className="mt-3 leading-7">
          A <strong>custom index</strong> is a basket of stocks combined into a single benchmark whose value you can
          track over time. Rather than relying on a ready-made index like the Nifty 50 or Sensex, you decide exactly
          which stocks go in and how they are weighted. This is useful for testing a theme or sector idea, comparing a
          model portfolio against the broad market, or simply understanding how different weighting methods change a
          benchmark&apos;s behaviour.
        </p>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">Market-cap vs. equal weighting</h2>
        <p className="mt-3 leading-7">
          In a <strong>market-cap weighted</strong> index, each stock&apos;s influence is proportional to its market
          capitalisation (price × shares outstanding) — so the largest companies move the index the most. This is how
          most major indices, including the Nifty 50, are constructed. In an <strong>equal-weighted</strong> index,
          every constituent carries the same weight regardless of size, giving smaller companies just as much say as
          large ones. Comparing the two for the same set of stocks is a great way to see the effect of concentration in
          mega-cap names.
        </p>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">How to build an index</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7">
          <li>Give your index a name (e.g. &ldquo;My Top 5 IT Index&rdquo;).</li>
          <li>Pick a start and end date and your exchange (NSE / BSE).</li>
          <li>Choose a weighting method — market-cap or equal weight.</li>
          <li>Add 2 or more stocks (shares auto-fill from the data source for market-cap mode).</li>
          <li>
            Hit <strong>Build</strong> to chart your index, then add indicators or export a PNG.
          </li>
        </ol>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">Frequently asked questions</h2>
        <div className="mt-4 space-y-5">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-base font-semibold text-zinc-900">{f.q}</h3>
              <p className="mt-1 leading-7 text-zinc-600">{f.a}</p>
            </div>
          ))}
        </div>

        {/* Funnel CTA back to the core product */}
        <div className="mt-12 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
          <h2 className="text-lg font-bold text-emerald-900">Preparing for the CMT exam?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Chartix is a focused CMT exam-prep platform — structured notes, 2000+ practice questions, and an AI tutor for
            Levels I, II and III.
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Start free
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Data from Yahoo Finance, for educational and informational purposes only — not investment advice.{' '}
          <Link href="/" className="text-emerald-600 hover:underline">
            Back to Chartix home
          </Link>
        </p>
      </article>
    </>
  );
}
