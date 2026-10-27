'use client';

import { useEffect, useState } from 'react';
import { nseDateToIso, cr, fmtDate, COLORS, type CashDay } from '@/lib/fii-dii/format';
import { Label, Panel } from './parts';
import { ShareButton } from './share';

type LiveRow = {
  date: string;
  fii_buy: number;
  fii_sell: number;
  fii_net: number;
  dii_buy: number;
  dii_sell: number;
  dii_net: number;
};

function toLive(r: LiveRow): CashDay & { raw: string } {
  return {
    raw: r.date,
    date: nseDateToIso(r.date) ?? '',
    fiiBuy: r.fii_buy, fiiSell: r.fii_sell, fiiNet: r.fii_net,
    diiBuy: r.dii_buy, diiSell: r.dii_sell, diiNet: r.dii_net,
  };
}

export function LiveOverlay({ dbLatestDate }: { dbLatestDate: string }) {
  const [live, setLive] = useState<(CashDay & { raw: string }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/fii-dii/latest')
      .then((r) => r.ok ? r.json() : null)
      .then((data: LiveRow | null) => {
        if (cancelled || !data?.date) return;
        const row = toLive(data);
        if (row.date && row.date > dbLatestDate && (row.fiiBuy > 0 || row.diiBuy > 0)) {
          setLive(row);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dbLatestDate]);

  if (!live) return null;

  const dateLabel = fmtDate(live.date, 'long');
  const combined = live.fiiNet + live.diiNet;
  const todayMsg = [
    `FII / DII data — ${dateLabel}`,
    `FII: ${cr(live.fiiNet, { compact: false })} (net ${live.fiiNet < 0 ? 'sold' : 'bought'})`,
    `DII: ${cr(live.diiNet, { compact: false })} (net ${live.diiNet < 0 ? 'sold' : 'bought'})`,
    `Net: ${cr(combined, { compact: false })}`,
  ].join('\n');

  return (
    <Panel className="mb-16" mark id="share-live">
      <div className="grid divide-y divide-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
        {([
          ['FII / FPI net', live.fiiNet, COLORS.fii, live.fiiBuy, live.fiiSell],
          ['DII net', live.diiNet, COLORS.dii, live.diiBuy, live.diiSell],
          ['Combined', combined, null, null, null],
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
          <ShareButton variant="primary" label="Share today's data" message={todayMsg} targetId="share-live"
            imageTitle="Institutional money flows" imageSubtitle={dateLabel} fileName={`chartix-fii-dii-${live.date}`} />
        </div>
        <p className="mt-3 max-w-3xl font-serif text-[19px] leading-[1.55] text-stone-800">
          {live.fiiNet >= 0
            ? `Foreign investors (FIIs) bought a net ${cr(live.fiiNet, { compact: false })}`
            : `Foreign investors (FIIs) sold a net ${cr(live.fiiNet, { compact: false })}`}
          {live.diiNet >= 0
            ? ` and domestic institutions (DIIs) bought a net ${cr(live.diiNet, { compact: false })}.`
            : ` and domestic institutions (DIIs) sold a net ${cr(live.diiNet, { compact: false })}.`}
        </p>
      </div>
    </Panel>
  );
}
