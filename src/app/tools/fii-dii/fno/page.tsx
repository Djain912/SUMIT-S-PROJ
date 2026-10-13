import type { Metadata } from 'next';
import { getFnoDays, getLastUpdated } from '@/lib/fii-dii/data';
import { fmtDate, fmtStamp, longShare, num, stance, type LongShort } from '@/lib/fii-dii/format';
import { Block, BrandTag, Label, PageIntro, Panel } from '@/components/fii-dii/parts';
import { FnoTrends, LongShareChart } from '@/components/fii-dii/charts';
import { PositionSplit } from '@/components/fii-dii/visuals';
import { ShareButton } from '@/components/fii-dii/share';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FII / DII F&O Positions — Index Futures & Options OI | Chartix',
  description: 'How FIIs and DIIs are positioned in Indian derivatives — long vs short in index futures, stock futures, index calls and puts, from NSE participant-wise open interest.',
  alternates: { canonical: '/tools/fii-dii/fno' },
};

const net = (p: LongShort) => p.long - p.short;

export default async function FiiDiiFno() {
  const [days, updated] = await Promise.all([getFnoDays(), getLastUpdated()]);
  const d = days[days.length - 1];
  const prev = days[days.length - 2];

  if (!d) {
    return <PageIntro eyebrow="FII & DII data · Derivatives" title="F&O positions">F&amp;O data is not available right now. Please check back after market close.</PageIntro>;
  }

  const idxPct = longShare(d.fii.idxFut);
  const callNet = net(d.fii.idxCall);
  const putNet = net(d.fii.idxPut);
  const optionsRead = callNet < 0 && putNet > 0
    ? 'In index options they were net sellers of calls and net buyers of puts — a defensive tilt.'
    : callNet > 0 && putNet < 0
      ? 'In index options they were net buyers of calls and net sellers of puts — a bullish tilt.'
      : 'Their index-options book was mixed, with no clear directional tilt.';
  const change = prev ? net(d.fii.idxFut) - net(prev.fii.idxFut) : null;
  const recent = days.slice(-10).reverse();
  const readMsg = [
    `FII F&O positioning — ${fmtDate(d.date, 'long')}`,
    `Index futures: ${idxPct.toFixed(0)}% long / ${(100 - idxPct).toFixed(0)}% short (${stance(idxPct)}), net ${num(net(d.fii.idxFut), true)} contracts`,
    `Index calls net ${num(callNet, true)} · Index puts net ${num(putNet, true)}`,
    optionsRead,
  ].join('\n');

  return (
    <>
      <PageIntro eyebrow="FII & DII data · Derivatives" title="F&O positions"
        meta={<>Participant-wise open interest for <span className="text-stone-600">{fmtDate(d.date, 'long')}</span>{updated.fno && <> · <span className="text-stone-600">Last updated {fmtStamp(updated.fno)}</span></>} · Figures are contracts, not rupees</>}>
        Who is betting which way in the derivatives market — how FIIs and DIIs split their futures and options between long and short.
      </PageIntro>

      <Panel className="mb-16 px-6 py-7" mark id="share-fno-read">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>The read</Label>
          <ShareButton variant="primary" label="Share F&O snapshot" message={readMsg} targetId="share-fno-read" imageTitle="FII F&O positioning" imageSubtitle={fmtDate(d.date, 'long')} fileName={`chartix-fno-${d.date}`} path="/tools/fii-dii/fno" />
        </div>
        <div className="mt-3 max-w-3xl space-y-2 font-serif text-[19px] leading-[1.55] text-stone-800">
          <p>
            FIIs held {idxPct.toFixed(0)}% of their index-futures contracts long and {(100 - idxPct).toFixed(0)}% short — {stance(idxPct)}.
            {change != null && change !== 0 && <> Their net position {change > 0 ? 'rose' : 'fell'} by {num(Math.abs(change))} contracts from the previous session.</>}
          </p>
          <p>{optionsRead}</p>
        </div>
      </Panel>

      <div className="space-y-20">
        <Block title="Foreign institutions (FII)" lead="The left of each bar is the share of contracts held long; the right is the share held short."
          aside={<ShareButton message={readMsg} targetId="share-fii-split" imageTitle="FII long vs short" imageSubtitle={fmtDate(d.date, 'long')} fileName={`chartix-fii-positions-${d.date}`} path="/tools/fii-dii/fno" />}>
          <div id="share-fii-split" className="relative divide-y divide-stone-200 border-y border-stone-200"><BrandTag className="-bottom-6 right-0" />
            <PositionSplit title="Index futures" p={d.fii.idxFut}
              note="Direct bets on the Nifty and Bank Nifty. A mostly short book means FIIs are hedged against, or positioned for, a fall." />
            <PositionSplit title="Index calls" p={d.fii.idxCall}
              note="Long calls gain if the index rises. Short (written) calls gain if the index stays below the strike — so heavy call writing caps upside expectations." />
            <PositionSplit title="Index puts" p={d.fii.idxPut}
              note="Long puts gain if the index falls and are often bought as portfolio protection. Short puts are a bet the index holds up." />
            <PositionSplit title="Stock futures" p={d.fii.stkFut}
              note="Positions in single-stock futures. These are often paired with cash holdings, so they say less about overall market direction." />
          </div>
        </Block>

        <Block title="Domestic institutions (DII)" lead="DIIs mainly use futures to hedge the shares they already own, so their positions are usually read as risk management rather than a view.">
          <div className="relative divide-y divide-stone-200 border-y border-stone-200"><BrandTag className="-bottom-6 right-0" />
            <PositionSplit title="Index futures" p={d.dii.idxFut} note="Index futures held by mutual funds, insurers and other domestic institutions." />
            <PositionSplit title="Stock futures" p={d.dii.stkFut} note="Largely hedges and arbitrage against cash-market holdings — a big short here is normal and not a bearish bet." />
          </div>
        </Block>

        <Block title="Net positions over time" lead="How each key position has built up or unwound, session by session. Hover any chart for long, short and net contracts."
          aside={<ShareButton message={`FII index futures net ${num(net(d.fii.idxFut), true)} contracts, calls ${num(callNet, true)}, puts ${num(putNet, true)} (${fmtDate(d.date)}).`} targetId="share-fno-trends" imageTitle="F&O net positions over time" imageSubtitle={`As of ${fmtDate(d.date, 'long')}`} fileName="chartix-fno-trends" path="/tools/fii-dii/fno" />}>
          <div id="share-fno-trends" className="bg-[#FAFAF8]"><FnoTrends days={days} /></div>
        </Block>

        <Block title="How the FII index-futures stance has moved" lead="Share of FII index-futures contracts held long, session by session. Below 50% means FIIs are net short."
          aside={<ShareButton message={`FIIs hold ${idxPct.toFixed(0)}% of their index-futures contracts long (${fmtDate(d.date)}) — ${stance(idxPct)}.`} targetId="share-longshare" imageTitle="FII index futures: share held long" imageSubtitle={`As of ${fmtDate(d.date, 'long')}`} fileName="chartix-fii-index-futures" path="/tools/fii-dii/fno" />}>
          <Panel className="p-5 sm:p-6" id="share-longshare"><LongShareChart days={days} /></Panel>
        </Block>

        <Block title="Recent sessions" lead="Net contracts (long minus short).">
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
                  <th className="px-6 py-3.5 text-left font-medium">Date</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII index fut. long</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII index fut. net</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII calls net</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII puts net</th>
                  <th className="px-6 py-3.5 text-right font-medium">DII index fut. net</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.date} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-6 py-3.5 text-[14px] text-stone-700">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{longShare(r.fii.idxFut).toFixed(1)}%</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{num(net(r.fii.idxFut), true)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-700">{num(net(r.fii.idxCall), true)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-700">{num(net(r.fii.idxPut), true)}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-700">{num(net(r.dii.idxFut), true)}</td>
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
