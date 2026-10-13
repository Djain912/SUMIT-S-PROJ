import type { Metadata } from 'next';
import { CASH_HISTORY_FROM, getCashDays, getLastUpdated } from '@/lib/fii-dii/data';
import { COLORS, cr, fmtDate, fmtMonth, fmtStamp, monthlyTotals, sum } from '@/lib/fii-dii/format';
import { Block, Label, PageIntro, Panel } from '@/components/fii-dii/parts';
import { MonthlyChart } from '@/components/fii-dii/charts';
import { DailyTable } from '@/components/fii-dii/daily-table';
import { SignedBar } from '@/components/fii-dii/visuals';
import { ShareButton } from '@/components/fii-dii/share';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FII / DII Data History — Daily & Monthly Flows | Chartix',
  description: 'Complete FII and DII cash-market history for Indian equities — monthly totals, every daily session, and CSV download. Free, from NSE data.',
  alternates: { canonical: '/tools/fii-dii/history' },
};

export default async function FiiDiiHistory() {
  const [rows, updated] = await Promise.all([getCashDays(), getLastUpdated()]);
  const months = monthlyTotals(rows);
  const n = rows.length;
  const avgFii = n ? sum(rows, 'fiiNet') / n : 0;
  const avgDii = n ? sum(rows, 'diiNet') / n : 0;
  const worstFii = rows.reduce((a, b) => (b.fiiNet < a.fiiNet ? b : a), rows[0]);
  const bestDii = rows.reduce((a, b) => (b.diiNet > a.diiNet ? b : a), rows[0]);
  const fiiSellDays = rows.filter((r) => r.fiiNet < 0).length;
  const lastMonth = months[months.length - 1];
  const statsMsg = n ? `FII / DII record, ${fmtDate(rows[0].date)} – ${fmtDate(rows[n - 1].date)} (${n} sessions): FIIs averaged ${cr(avgFii)} a day and sold on ${fiiSellDays} sessions; DIIs averaged ${cr(avgDii)} a day.` : '';
  const monthMsg = lastMonth ? `FII / DII flows, ${fmtMonth(lastMonth.key, true)} so far (${lastMonth.sessions} sessions): FII ${cr(lastMonth.fii)}, DII ${cr(lastMonth.dii)}.` : '';
  const monthMax = Math.max(1, ...months.flatMap((m) => [Math.abs(m.fii), Math.abs(m.dii)]));

  return (
    <>
      <PageIntro eyebrow="FII & DII data · History" title="Every session, on record"
        meta={n ? <>{n} sessions from {fmtDate(rows[0].date)} to {fmtDate(rows[n - 1].date)}{updated.cash && <> · <span className="text-stone-600">Last updated {fmtStamp(updated.cash)}</span></>}<br />The record starts on {fmtDate(CASH_HISTORY_FROM)}, the first date from which every session is complete and checked against exchange figures.</> : null}>
        The full daily record of foreign and domestic institutional flows in the cash market, totalled by month.
      </PageIntro>

      {n > 0 && (<>
        <div className="mb-4 flex justify-end"><ShareButton message={statsMsg} targetId="share-stats" imageTitle="FII & DII: the record so far" imageSubtitle={`${n} sessions`} fileName="chartix-fii-dii-record" /></div>
        <Panel mark id="share-stats" className="mb-16 grid grid-cols-2 divide-stone-200 lg:grid-cols-4 lg:divide-x">
          {([
            ['Average FII day', cr(avgFii), `FIIs sold on ${fiiSellDays} of ${n} sessions`],
            ['Average DII day', cr(avgDii), `${n - rows.filter((r) => r.diiNet < 0).length} of ${n} sessions were net buying`],
            ['Largest FII selling day', cr(worstFii.fiiNet, { compact: false }), fmtDate(worstFii.date)],
            ['Largest DII buying day', cr(bestDii.diiNet, { compact: false }), fmtDate(bestDii.date)],
          ] as const).map(([k, v, note], i) => (
            <div key={k} className={`px-6 py-6 ${i < 2 ? 'border-b border-stone-200 lg:border-b-0' : ''} ${i % 2 === 1 ? 'border-l border-stone-200 lg:border-l-0' : ''}`}>
              <Label>{k}</Label>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-stone-900">{v}</p>
              <p className="mt-2.5 text-[12.5px] text-stone-500">{note}</p>
            </div>
          ))}
        </Panel>
      </>)}

      <div className="space-y-20">
        <Block title="Month by month" lead="Net flows totalled for each calendar month. Hover a month for the numbers."
          aside={<ShareButton message={monthMsg} targetId="share-monthly" imageTitle="FII & DII flows by month" imageSubtitle={`${fmtMonth(months[0]?.key ?? '2026-01', true)} – ${fmtMonth(lastMonth?.key ?? '2026-01', true)}`} fileName="chartix-fii-dii-monthly" path="/tools/fii-dii/history" />}>
          <Panel className="p-5 sm:p-6" id="share-monthly"><MonthlyChart months={months} /></Panel>
          <Panel className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
                  <th className="px-6 py-3.5 text-left font-medium">Month</th>
                  <th className="px-4 py-3.5 text-right font-medium">Sessions</th>
                  <th className="px-4 py-3.5 text-right font-medium">FII net</th>
                  <th className="w-[16%] px-4 py-3.5" aria-hidden />
                  <th className="px-4 py-3.5 text-right font-medium">DII net</th>
                  <th className="w-[16%] px-4 py-3.5" aria-hidden />
                  <th className="px-6 py-3.5 text-right font-medium">Combined</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.key} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-6 py-4 text-[14px] text-stone-800">{fmtMonth(m.key, true)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-500">{m.sessions}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(m.fii)}</td>
                    <td className="px-4 py-4"><SignedBar value={m.fii} max={monthMax} color={COLORS.fii} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-900">{cr(m.dii)}</td>
                    <td className="px-4 py-4"><SignedBar value={m.dii} max={monthMax} color={COLORS.dii} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-stone-600">{cr(m.fii + m.dii)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Block>

        <Block title="Daily record" lead="Gross buying, gross selling and net for both groups. Filter by month or download the data as CSV.">
          <DailyTable rows={rows} />
        </Block>
      </div>
    </>
  );
}
