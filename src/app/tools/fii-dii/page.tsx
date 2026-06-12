import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'FII / DII Data Terminal — Live Institutional Flows (NSE) | Chartix',
  description:
    'Free FII & DII data terminal for Indian markets. Track daily FII/FPI and DII net buy/sell flows, F&O positioning, 45-day flow heatmaps and NSDL sector allocation — live from NSE, no login required.',
  alternates: { canonical: '/tools/fii-dii' },
  openGraph: {
    title: 'FII / DII Data Terminal — Chartix',
    description:
      'Live FII/DII institutional flow tracker for Indian markets — daily net flows, F&O positions, heatmaps and sector data. Free, no login.',
    url: '/tools/fii-dii',
  },
};

const faqs = [
  {
    q: 'What is FII and DII data?',
    a: 'FII (Foreign Institutional Investors, also called FPI) and DII (Domestic Institutional Investors) data shows how much these large institutions bought and sold in the Indian cash market each day. The net figure — buy value minus sell value — is one of the most-watched gauges of institutional sentiment, because these players move a large share of daily turnover.',
  },
  {
    q: 'Where does this FII/DII data come from?',
    a: 'The data is sourced from official public reports: the NSE FII/DII trading-activity report and F&O participant-wise open interest archives for derivatives, and NSDL FPI Monitor reports for fortnightly sector allocation. It is published after market close each trading day.',
  },
  {
    q: 'Is the FII/DII terminal free?',
    a: 'Yes. The Chartix FII/DII terminal is completely free and needs no login or sign-up. Just open the page and the latest institutional flow data loads automatically.',
  },
  {
    q: 'What does FII selling and DII buying mean?',
    a: 'When FIIs are net sellers it means foreign institutions took money off the table that day; when DIIs are net buyers it means domestic institutions (mutual funds, insurers) absorbed that supply. Markets often hold up when strong DII buying offsets FII selling, and tend to fall sharply when both sell together. The terminal visualises this tug-of-war with a flow-strength meter and streak trackers.',
  },
  {
    q: 'What is the F&O / derivatives positioning tab?',
    a: 'It shows participant-wise open interest — how FIIs and DIIs are positioned in index futures, stock futures, and index options (calls and puts). A heavy net-short index-futures position by FIIs, for example, is often read as defensive or bearish positioning.',
  },
  {
    q: 'How often is the data updated?',
    a: 'NSE publishes FII/DII numbers after the cash market closes (typically by evening on trading days). The terminal refreshes automatically and also lets you force a live sync. Sector allocation from NSDL updates on a fortnightly basis.',
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
  name: 'Chartix FII / DII Data Terminal',
  url: `${siteConfig.url}/tools/fii-dii`,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description:
    'Free web terminal tracking FII/FPI and DII institutional money flows in Indian markets — daily net flows, F&O positioning, 45-day heatmaps and NSDL sector allocation.',
};

export default function FiiDiiPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* The interactive terminal fills the first screen */}
      <iframe
        src="/fii-dii-app/index.html?v=3"
        title="Chartix FII / DII Data Terminal"
        className="block h-screen w-full border-0"
      />

      {/* ── SEO / educational content below the tool ── */}
      <article className="mx-auto max-w-3xl px-5 py-16 text-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Free Tool</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-900 sm:text-4xl">
          FII / DII Data Terminal — Track Institutional Money Flows
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          The Chartix FII/DII terminal tracks how <strong>Foreign Institutional Investors (FII/FPI)</strong> and{' '}
          <strong>Domestic Institutional Investors (DII)</strong> are moving money in Indian markets — free and with no
          login. See daily net buy/sell flows, F&amp;O derivatives positioning, 45-day concentration heatmaps and NSDL
          fortnightly sector allocation, all sourced from official NSE and NSDL reports.
        </p>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">What is FII/DII data and why does it matter?</h2>
        <p className="mt-3 leading-7">
          FIIs and DIIs account for a large share of daily turnover on Indian exchanges, so their net activity is a
          closely-watched proxy for institutional sentiment. A run of heavy <strong>FII selling</strong> can signal
          foreign risk-off; sustained <strong>DII buying</strong> shows domestic money — mutual funds and insurers,
          fed by steady SIP inflows — stepping in to absorb it. The day-to-day tug-of-war between the two often explains
          why the index holds up, or breaks down, on a given session.
        </p>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">What the terminal shows</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
          <li>
            <strong>FII/DII cash flows</strong> — latest net buy/sell with a flow-strength meter and buying/selling
            streak trackers.
          </li>
          <li>
            <strong>F&amp;O positions</strong> — participant-wise open interest across index futures, stock futures and
            index options (calls &amp; puts), with long/short ratio bars.
          </li>
          <li>
            <strong>Flow analytics</strong> — daily, weekly, monthly and annual archives with magnitude bars, filters
            and CSV export.
          </li>
          <li>
            <strong>45-day heatmaps</strong> — GitHub-style matrices showing FII sell-off depth and DII absorption.
          </li>
          <li>
            <strong>Sector allocation</strong> — NSDL fortnightly FPI sector data with AUM weight, FII ownership and
            momentum trends.
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-emerald-900">Data sources</h2>
        <p className="mt-3 leading-7">
          Cash-market flows and F&amp;O participant data come from the{' '}
          <a
            href="https://www.nseindia.com/reports-indices-fii-dii-trading-activity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            NSE FII/DII reports
          </a>
          , and fortnightly sector allocation from the{' '}
          <a
            href="https://www.fpi.nsdl.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            NSDL FPI Monitor
          </a>
          . Data is published after market close on trading days.
        </p>

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

        {/* Open-source attribution (MIT) */}
        <p className="mt-8 text-center text-xs text-zinc-400">
          The FII/DII data engine is open-source software by{' '}
          <a
            href="https://twitter.com/mr_chartist"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            Mr. Chartist
          </a>
          , used under the MIT License. Flow data is from NSE &amp; NSDL, for educational and informational purposes only
          — not investment advice.{' '}
          <Link href="/" className="text-emerald-600 hover:underline">
            Back to Chartix home
          </Link>
        </p>
      </article>
    </>
  );
}
