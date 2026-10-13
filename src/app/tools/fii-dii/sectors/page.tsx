import type { Metadata } from 'next';
import { getSectors } from '@/lib/fii-dii/data';
import { cr, fmtDate } from '@/lib/fii-dii/format';
import { Block, Label, PageIntro, Panel } from '@/components/fii-dii/parts';
import { FlowBars, HoldingsBars, Spark } from '@/components/fii-dii/visuals';
import { ShareButton } from '@/components/fii-dii/share';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FPI Sector Allocation — Where Foreign Money Is Invested | Chartix',
  description: 'Sector-wise FPI holdings and flows in Indian equities from NSDL fortnightly reports — share of portfolio, fortnight and one-year net flows, and FII ownership by sector.',
  alternates: { canonical: '/tools/fii-dii/sectors' },
};

export default async function FiiDiiSectors() {
  const { sectors, asOf } = await getSectors();
  const byShare = [...sectors].sort((a, b) => b.aumPct - a.aumPct);
  const shown = byShare.filter((s) => s.aumPct >= 1);
  const otherPct = byShare.filter((s) => s.aumPct < 1).reduce((t, s) => t + s.aumPct, 0);
  const flows = [...sectors].filter((s) => s.fortnightCr !== 0).sort((a, b) => b.fortnightCr - a.fortnightCr);
  const yearFlows = [...sectors].filter((s) => s.oneYearCr !== 0).sort((a, b) => b.oneYearCr - a.oneYearCr);
  const top = byShare[0];
  const biggestOut = flows[flows.length - 1];
  const biggestIn = flows[0];
  const total = sectors.reduce((t, s) => t + s.fortnightCr, 0);
  const asOfLabel = asOf ? `NSDL report, period ending ${fmtDate(asOf)}` : 'NSDL fortnightly report';
  const readMsg = top && biggestIn && biggestOut
    ? `FPI sector snapshot (${asOfLabel}): ${top.name} is the largest holding at ${top.aumPct.toFixed(1)}%. Biggest fortnight outflow: ${biggestOut.name} (${cr(biggestOut.fortnightCr)}).${biggestIn.fortnightCr > 0 ? ` Biggest inflow: ${biggestIn.name} (${cr(biggestIn.fortnightCr)}).` : ''}`
    : '';
  const ageDays = asOf ? Math.floor((Date.now() - new Date(`${asOf}T00:00:00Z`).getTime()) / 86400000) : null;

  return (
    <>
      <PageIntro eyebrow="FII & DII data · Sectors" title="Where foreign money sits"
        meta={asOf ? <><span className="text-stone-600">Last updated: NSDL fortnightly report for the period ending {fmtDate(asOf, 'long')}</span> · NSDL publishes these reports twice a month</> : null}>
        How foreign portfolio investors (FPIs) divide their Indian equity holdings across sectors, and where they have been adding or pulling money.
      </PageIntro>

      {ageDays != null && ageDays > 30 && (
        <div className="mb-10 border-l-2 border-amber-500 py-1 pl-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-700">Older data</p>
          <p className="mt-1 max-w-3xl text-[14.5px] leading-relaxed text-stone-600">
            This is the most recent report available from our NSDL data source, and it is {Math.round(ageDays / 30)} months old.
            Treat these figures as a snapshot of that period rather than current positioning. Daily cash and F&amp;O data on the other pages are up to date.
          </p>
        </div>
      )}

      {top && biggestIn && biggestOut && (
        <Panel className="mb-16 px-6 py-7" mark id="share-sector-read">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>The read</Label>
            <ShareButton variant="primary" label="Share sector snapshot" message={readMsg} targetId="share-sector-read" imageTitle="Where foreign money sits" imageSubtitle={asOfLabel} fileName="chartix-fpi-sectors" path="/tools/fii-dii/sectors" />
          </div>
          <div className="mt-3 max-w-3xl space-y-2 font-serif text-[19px] leading-[1.55] text-stone-800">
            <p>{top.name} is the largest FPI holding, at {top.aumPct.toFixed(1)}% of their Indian equity portfolio.</p>
            <p>
              Over the fortnight, FPIs {total < 0 ? 'pulled' : 'added'} a net {cr(total, { sign: false })} across all sectors.
              The biggest outflow was from {biggestOut.name} ({cr(biggestOut.fortnightCr)})
              {biggestIn.fortnightCr > 0 ? <> and the biggest inflow went to {biggestIn.name} ({cr(biggestIn.fortnightCr)})</> : null}.
            </p>
          </div>
        </Panel>
      )}

      <div className="space-y-20">
        <Block title="Share of FPI holdings" lead="Each sector's slice of the total FPI equity portfolio in India."
          aside={<ShareButton message={readMsg} targetId="share-holdings" imageTitle="FPI holdings by sector" imageSubtitle={asOfLabel} fileName="chartix-share-holdings" path="/tools/fii-dii/sectors" />}>
          <Panel id="share-holdings" className="p-6 pb-9" mark>
            <HoldingsBars sectors={shown} />
            {otherPct > 0 && <p className="mt-5 text-[13px] text-stone-500">Sectors under 1% each make up the remaining {otherPct.toFixed(1)}%.</p>}
          </Panel>
        </Block>

        <Block title="Fortnight flows" lead="Net FPI buying (right) or selling (left) in each sector over the reporting fortnight."
          aside={<ShareButton message={readMsg} targetId="share-fortnight" imageTitle="FPI sector flows, fortnight" imageSubtitle={asOfLabel} fileName="chartix-share-fortnight" path="/tools/fii-dii/sectors" />}>
          <Panel id="share-fortnight" className="p-6 pb-9" mark><FlowBars sectors={flows} field="fortnightCr" /></Panel>
        </Block>

        <Block title="One-year flows" lead="Net FPI buying or selling in each sector over the trailing twelve months."
          aside={<ShareButton message={readMsg} targetId="share-oneyear" imageTitle="FPI sector flows, one year" imageSubtitle={asOfLabel} fileName="chartix-share-oneyear" path="/tools/fii-dii/sectors" />}>
          <Panel id="share-oneyear" className="p-6 pb-9" mark><FlowBars sectors={yearFlows} field="oneYearCr" /></Panel>
        </Block>

        <Block title="All sectors" lead="FII ownership is the share of each sector's market value held by foreign investors. The small chart shows net flows over the last 13 fortnightly reports.">
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
                  <th className="px-6 py-3.5 text-left font-medium">Sector</th>
                  <th className="px-4 py-3.5 text-right font-medium">Share of holdings</th>
                  <th className="px-4 py-3.5 text-right font-medium">Fortnight flow</th>
                  <th className="px-4 py-3.5 text-right font-medium">1-year flow</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII ownership</th>
                  <th className="px-6 py-3.5 text-right font-medium">Last 13 reports</th>
                </tr>
              </thead>
              <tbody>
                {byShare.map((s) => (
                  <tr key={s.name} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-6 py-3.5 text-[14px] text-stone-800">{s.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{s.aumPct.toFixed(1)}%</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(s.fortnightCr)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-700">{cr(s.oneYearCr)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-700">{s.fiiOwn.toFixed(1)}%</td>
                    <td className="px-6 py-3.5 text-right"><Spark values={s.historyCr} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Block>
      </div>
    </>
  );
}
