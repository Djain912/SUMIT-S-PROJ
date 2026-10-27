import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { siteConfig } from '@/lib/site';
import { LabCta } from '@/components/tools/lab-header';
import { getCashDays, getLastUpdated } from '@/lib/fii-dii/data';
import { COLORS, cr, fmtDate, fmtStamp, sessionSummary, streak, sum } from '@/lib/fii-dii/format';
import { Block, Label, PageIntro, Panel } from '@/components/fii-dii/parts';
import { CumulativeChart, DailyFlowChart } from '@/components/fii-dii/charts';
import { SignedBar } from '@/components/fii-dii/visuals';
import { ShareButton } from '@/components/fii-dii/share';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FII / DII Data Today — Live Institutional Flows (NSE) | Chartix',
  description:
    'Free FII & DII data for Indian markets. Track daily FII/FPI and DII net buy/sell flows, cumulative trends, F&O positioning and NSDL sector allocation — from NSE, no login required.',
  alternates: { canonical: '/tools/fii-dii' },
  openGraph: {
    title: 'FII / DII Data — Chartix',
    description:
      'Daily FII/DII institutional flows for Indian markets — net flows, history, F&O positions and sector data. Free, no login.',
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
    a: 'Cash-market flows and F&O participant open interest come from the official NSE FII/DII trading-activity report and NSE F&O archives. Fortnightly sector allocation comes from NSDL FPI Monitor reports. Data is published after market close each trading day.',
  },
  {
    q: 'Is this FII/DII tracker free?',
    a: 'Yes. It is completely free and needs no login or sign-up. Open the page and the latest institutional flow data is already there.',
  },
  {
    q: 'What does FII selling and DII buying mean?',
    a: 'When FIIs are net sellers, foreign institutions took money off the table that day; when DIIs are net buyers, domestic institutions such as mutual funds and insurers absorbed that supply. Markets often hold up when strong DII buying offsets FII selling, and tend to fall sharply when both sell together.',
  },
  {
    q: 'What does the F&O positions page show?',
    a: 'It shows participant-wise open interest — how FIIs and DIIs are positioned in index futures, stock futures and index options. A heavily net-short index-futures position by FIIs, for example, is usually read as defensive or bearish positioning.',
  },
  {
    q: 'How often is the data updated?',
    a: 'NSE publishes FII/DII numbers after the cash market closes, typically by evening on trading days, and this page updates automatically. Sector allocation from NSDL is published fortnightly.',
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
  name: 'Chartix FII / DII Data',
  url: `${siteConfig.url}/tools/fii-dii`,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description:
    'Free tracker of FII/FPI and DII institutional money flows in Indian markets — daily net flows, history, F&O positioning and NSDL sector allocation.',
};

const PERIODS: [string, number][] = [['Last 5 sessions', 5], ['Last 22 sessions', 22], ['Last 65 sessions', 65], ['Last 130 sessions', 130]];

export default async function FiiDiiOverview() {
  const [rows, updated] = await Promise.all([getCashDays(), getLastUpdated()]);
  const latest = rows[rows.length - 1];
  const summary = sessionSummary(rows);

  const periods = [...PERIODS.filter(([, n]) => n <= rows.length), [`Since ${fmtDate(rows[0]?.date ?? '')}`, rows.length] as [string, number]]
    .map(([label, n]) => {
      const slice = rows.slice(-n);
      return { label, n, fii: sum(slice, 'fiiNet'), dii: sum(slice, 'diiNet') };
    });
  const periodMax = Math.max(1, ...periods.flatMap((p) => [Math.abs(p.fii), Math.abs(p.dii)]));
  const recent = rows.slice(-10).reverse();

  const fs = streak(rows, 'fiiNet');
  const ds = streak(rows, 'diiNet');
  const dateLabel = latest ? fmtDate(latest.date, 'long') : '';
  const todayMsg = latest ? [
    `FII / DII data — ${dateLabel}`,
    `FII: ${cr(latest.fiiNet, { compact: false })} (net ${latest.fiiNet < 0 ? 'sold' : 'bought'})`,
    `DII: ${cr(latest.diiNet, { compact: false })} (net ${latest.diiNet < 0 ? 'sold' : 'bought'})`,
    `Net: ${cr(latest.fiiNet + latest.diiNet, { compact: false })}`,
    ...(fs.n >= 2 || ds.n >= 2 ? [[
      fs.n >= 2 ? `FIIs have ${fs.buying ? 'bought' : 'sold'} ${fs.n} sessions in a row` : '',
      ds.n >= 2 ? `DIIs have ${ds.buying ? 'bought' : 'sold'} ${ds.n} in a row` : '',
    ].filter(Boolean).join('; ') + '.'] : []),
  ].join('\n') : '';
  const total = periods[periods.length - 1];
  const tugMsg = total ? `Since ${fmtDate(rows[0].date)}, FIIs have net ${total.fii < 0 ? 'sold' : 'bought'} ${cr(total.fii, { sign: false })} while DIIs have net ${total.dii < 0 ? 'sold' : 'bought'} ${cr(total.dii, { sign: false })} in Indian equities.` : '';
  const weekly = periods[0];
  const totalsMsg = weekly ? `FII / DII flows, ${weekly.label.toLowerCase()}: FII ${cr(weekly.fii)}, DII ${cr(weekly.dii)}, combined ${cr(weekly.fii + weekly.dii)}.` : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      <PageIntro eyebrow="FII & DII data · NSE cash market" title="Institutional money flows"
        meta={latest ? <>Latest session: <span className="text-stone-600">{fmtDate(latest.date, 'long')}</span>{updated.cash && <> · <span className="text-stone-600">Last updated {fmtStamp(updated.cash)}</span></>} · Refreshed after every market close</> : null}>
        How foreign (FII/FPI) and domestic (DII) institutions are buying and selling Indian equities — free, no login.
      </PageIntro>

      {latest && (
        <Panel className="mb-16" mark id="share-today">
          <div className="grid divide-y divide-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {([
              ['FII / FPI net', latest.fiiNet, COLORS.fii, latest.fiiBuy, latest.fiiSell],
              ['DII net', latest.diiNet, COLORS.dii, latest.diiBuy, latest.diiSell],
              ['Combined', latest.fiiNet + latest.diiNet, null, null, null],
            ] as const).map(([label, v, color, buy, sell]) => (
              <div key={label} className="px-6 py-7">
                <div className="flex items-center gap-2">
                  {color && <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />}
                  <Label>{label}</Label>
                </div>
                <p className="mt-3 font-serif text-[40px] leading-none tracking-[-0.01em] text-stone-900">{cr(v, { compact: false })}</p>
                <p className="mt-3 text-[13px] text-stone-500">
                  {buy != null && sell != null
                    ? <>Bought {cr(buy, { sign: false, compact: false })} · Sold {cr(sell, { sign: false, compact: false })}</>
                    : v >= 0 ? 'Net money into equities' : 'Net money out of equities'}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>What happened</Label>
              <ShareButton variant="primary" label="Share today's data" message={todayMsg} targetId="share-today"
                imageTitle="Institutional money flows" imageSubtitle={dateLabel} fileName={`chartix-fii-dii-${latest.date}`} />
            </div>
            <div className="mt-3 max-w-3xl space-y-2 font-serif text-[19px] leading-[1.55] text-stone-800">
              {summary.map((s) => <p key={s}>{s}</p>)}
            </div>
          </div>
        </Panel>
      )}

      <div className="space-y-20">
        <Block title="Daily flows" lead="Each pair of bars is one session — above the line is net buying, below is net selling. Hover for exact numbers."
          aside={<ShareButton message={latest ? `FII vs DII daily net flows (latest ${fmtDate(latest.date)}): FII ${cr(latest.fiiNet)}, DII ${cr(latest.diiNet)}.` : ''} targetId="share-daily" imageTitle="FII vs DII daily flows" imageSubtitle={dateLabel} fileName="chartix-fii-dii-daily" />}>
          <Panel className="p-5 sm:p-6" id="share-daily"><DailyFlowChart rows={rows} /></Panel>
        </Block>

        <Block title="The tug of war" lead="Every session added up. The gap between the two lines shows how much foreign selling domestic institutions have absorbed."
          aside={<ShareButton message={tugMsg} targetId="share-tug" imageTitle="The tug of war: FII vs DII" imageSubtitle={`Running total since ${fmtDate(rows[0]?.date ?? '')}`} fileName="chartix-fii-dii-cumulative" />}>
          <Panel className="p-5 sm:p-6" id="share-tug"><CumulativeChart rows={rows} /></Panel>
        </Block>

        <Block title="Totals by period" lead="Net flows summed over recent windows."
          aside={<ShareButton message={totalsMsg} targetId="share-totals" imageTitle="FII & DII totals by period" imageSubtitle={dateLabel ? `As of ${dateLabel}` : ''} fileName="chartix-fii-dii-totals" />}>
          <Panel className="overflow-x-auto" id="share-totals">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
                  <th className="px-6 py-3.5 text-left font-medium">Window</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII net</th>
                  <th className="w-[18%] px-4 py-3.5" aria-hidden />
                  <th className="px-4 py-3.5 text-right font-medium">DII net</th>
                  <th className="w-[18%] px-4 py-3.5" aria-hidden />
                  <th className="px-6 py-3.5 text-right font-medium">Combined</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.label} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-6 py-4 text-[14px] text-stone-800">{p.label}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(p.fii)}</td>
                    <td className="px-4 py-4"><SignedBar value={p.fii} max={periodMax} color={COLORS.fii} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(p.dii)}</td>
                    <td className="px-4 py-4"><SignedBar value={p.dii} max={periodMax} color={COLORS.dii} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-600">{cr(p.fii + p.dii)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Block>

        <Block title="Recent sessions" aside={<Link href="/tools/fii-dii/history" className="inline-flex items-center gap-1 text-[14px] text-emerald-800 hover:underline">Full history <ArrowUpRight className="h-4 w-4" /></Link>}>
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
                  <th className="px-6 py-3.5 text-left font-medium">Date</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII net</th>
                  <th className="px-4 py-3.5 text-right font-medium">DII net</th>
                  <th className="px-6 py-3.5 text-right font-medium">Combined</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.date} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-6 py-3.5 text-[14px] text-stone-700">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(r.fiiNet, { compact: false })}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(r.diiNet, { compact: false })}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-600">{cr(r.fiiNet + r.diiNet, { compact: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Block>

        <section className="grid gap-4 md:grid-cols-3">
          {([
            ['/tools/fii-dii/history', 'History', 'Every verified session, month by month, with CSV download.'],
            ['/tools/fii-dii/fno', 'F&O positions', 'How FIIs and DIIs are positioned in futures and options.'],
            ['/tools/fii-dii/sectors', 'Sectors', 'Where foreign portfolio money is invested, sector by sector.'],
          ] as const).map(([href, t, d]) => (
            <Link key={href} href={href} className="group rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-stone-400">
              <span className="flex items-center justify-between font-serif text-[22px] text-stone-900">{t}<ArrowUpRight className="h-5 w-5 text-stone-300 transition group-hover:text-emerald-800" /></span>
              <span className="mt-2 block text-[14px] leading-relaxed text-stone-500">{d}</span>
            </Link>
          ))}
        </section>

        <section className="grid gap-12 border-t border-stone-200 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-stone-900">What is FII and DII data, and why does it matter?</h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-stone-600">
              FIIs and DIIs account for a large share of daily turnover on Indian exchanges, so their net activity is a closely watched
              proxy for institutional sentiment. A run of heavy <strong className="font-medium text-stone-900">FII selling</strong> can signal
              foreign risk-off; sustained <strong className="font-medium text-stone-900">DII buying</strong> shows domestic money — mutual funds
              and insurers, fed by steady SIP inflows — stepping in to absorb it.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-stone-900">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
              {faqs.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                    {f.q}<span className="text-stone-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[14.5px] leading-[1.7] text-stone-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <LabCta />
      </div>
    </>
  );
}
