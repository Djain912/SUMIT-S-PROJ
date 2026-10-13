import { Redis } from '@upstash/redis';
import { sendTelegramMessage, sendTelegramPhotos, telegramConfigured } from '@/lib/telegram';
import { getCashDays, getFnoDays, getSectors } from './data';
import { renderDailyCard, renderFnoCard, renderFnoTrendsCard, renderSectorCard } from './cards';
import { FNO_POSITIONS, cr, fmtDate, lastDays, longShare, num, stance, streak } from './format';

// End-of-day Telegram delivery for the FII/DII tracker, called by the logger cron.
//  • Posts the daily card, the F&O snapshot and the F&O trends grid as three
//    separate messages (each with its own caption), once per session each, as
//    soon as both cash and F&O are stored. The 8 AM run posts whatever exists
//    if the evening never completed.
//  • Posts the sector card once per new NSDL report.
//  • On the 8 AM run, alerts if the last trading day is still missing data.

// Captions get forwarded to the public, so always link the live site (never a local dev URL).
const PUBLIC_SITE = 'https://chartix.in';
const link = (path = '/tools/fii-dii') => `${PUBLIC_SITE}${path}?utm_source=telegram&utm_medium=share&utm_campaign=fii-dii`;

let redis: Redis | null = null;
function kv(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  redis ??= new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
  return redis;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Most recent weekday strictly before today, in IST (YYYY-MM-DD). */
function lastWeekdayIst(): string {
  const d = new Date(Date.now() + 5.5 * 3600_000);
  do d.setUTCDate(d.getUTCDate() - 1); while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

/** NSE only publishes a participant-OI file for trading days, so its existence marks one. */
async function isTradingDay(iso: string): Promise<boolean> {
  const [y, m, d] = iso.split('-');
  // NSE's archive server rejects HEAD requests, so fetch the (small) file itself.
  const res = await fetch(`https://archives.nseindia.com/content/nsccl/fao_participant_oi_${d}${m}${y}.csv`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return !!res?.ok;
}

function dailyCaption(rows: Awaited<ReturnType<typeof getCashDays>>) {
  const d = rows[rows.length - 1];
  const f = streak(rows, 'fiiNet');
  const di = streak(rows, 'diiNet');
  const streaks = [
    f.n >= 2 ? `FIIs have ${f.buying ? 'bought' : 'sold'} ${f.n} sessions in a row` : '',
    di.n >= 2 ? `DIIs have ${di.buying ? 'bought' : 'sold'} ${di.n} in a row` : '',
  ].filter(Boolean).join('; ');
  return [
    `FII / DII data — ${fmtDate(d.date, 'long')}`,
    `FII: ${cr(d.fiiNet, { compact: false })} (net ${d.fiiNet < 0 ? 'sold' : 'bought'})`,
    `DII: ${cr(d.diiNet, { compact: false })} (net ${d.diiNet < 0 ? 'sold' : 'bought'})`,
    `Net: ${cr(d.fiiNet + d.diiNet, { compact: false })}`,
    ...(streaks ? [`${streaks}.`] : []),
    '',
    `Free daily FII & DII data → ${link()}`,
  ].join('\n');
}

function fnoCaption(days: Awaited<ReturnType<typeof getFnoDays>>) {
  const d = days[days.length - 1];
  const p = longShare(d.fii.idxFut);
  const calls = d.fii.idxCall.long - d.fii.idxCall.short;
  const puts = d.fii.idxPut.long - d.fii.idxPut.short;
  const tilt = calls < 0 && puts > 0 ? 'Net sellers of calls and buyers of puts — a defensive tilt.'
    : calls > 0 && puts < 0 ? 'Net buyers of calls and sellers of puts — a bullish tilt.'
      : 'Options book mixed, no clear tilt.';
  return [
    `FII F&O positioning — ${fmtDate(d.date, 'long')}`,
    `Index futures: ${p.toFixed(0)}% long / ${(100 - p).toFixed(0)}% short (${stance(p)}), net ${num(d.fii.idxFut.long - d.fii.idxFut.short, true)} contracts`,
    `Index calls net ${num(calls, true)} · Index puts net ${num(puts, true)}`,
    tilt,
    '',
    `Free daily FII & DII data → ${link('/tools/fii-dii/fno')}`,
  ].join('\n');
}

function trendsCaption(days: Awaited<ReturnType<typeof getFnoDays>>) {
  const data = lastDays(days, 92);
  const first = data[0];
  const last = data[data.length - 1];
  const lines = FNO_POSITIONS.map((pos) => {
    const a = pos.pick(first), b = pos.pick(last);
    const now = b.long - b.short;
    return `${pos.title}: net ${num(now, true)} (${num(now - (a.long - a.short), true)} since ${fmtDate(first.date, 'day')})`;
  });
  return [
    `F&O net positions — last 3 months to ${fmtDate(last.date)}`,
    ...lines,
    '',
    `Free daily FII & DII data → ${link('/tools/fii-dii/fno')}`,
  ].join('\n');
}

export async function runTelegramNotify({ morning }: { morning: boolean }) {
  if (!telegramConfigured()) return { skipped: 'Telegram not configured' };
  const store = kv();
  const out: Record<string, unknown> = {};

  // 1. Daily card, F&O snapshot and F&O trends — three separate messages
  try {
    const [cash, fno] = await Promise.all([getCashDays(), getFnoDays()]);
    const latest = cash[cash.length - 1];
    const fnoReady = !!fno.length && fno[fno.length - 1].date === latest?.date;
    // Without Redis we can't de-duplicate across runs, so only the single 8 AM run posts.
    const shouldTry = !!latest && (store ? fnoReady || morning : morning);
    const items = !shouldTry ? [] : [
      { id: 'cash', render: () => renderDailyCard(cash), caption: () => dailyCaption(cash) },
      ...(fnoReady ? [
        { id: 'fno', render: () => renderFnoCard(fno), caption: () => fnoCaption(fno) },
        { id: 'fno-trends', render: () => renderFnoTrendsCard(fno), caption: () => trendsCaption(fno) },
      ] : []),
    ];
    const posted: string[] = [];
    for (const item of items) {
      const key = `fii-dii:tg:${item.id}:${latest.date}`;
      if (store && (await store.set(key, '1', { nx: true, ex: 60 * 60 * 24 * 10 })) !== 'OK') continue;
      try {
        await sendTelegramPhotos([{ png: await item.render(), name: `${item.id}-${latest.date}` }], item.caption());
        posted.push(item.id);
      } catch (e) {
        await store?.del(key); // let the next run retry just this message
        throw e;
      }
    }
    out.daily = { latest: latest?.date, fnoReady, posted };
  } catch (e) {
    out.daily = { error: (e as Error).message };
  }

  // 2. Sector card — once per new NSDL report, and only if it's recent
  try {
    const { sectors, asOf } = await getSectors();
    const fresh = asOf && Date.now() - new Date(`${asOf}T00:00:00Z`).getTime() < 30 * 86400_000;
    const key = `fii-dii:tg:sectors:${asOf}`;
    if (store && fresh && (await store.set(key, '1', { nx: true })) === 'OK') {
      try {
        const top = [...sectors].sort((a, b) => b.aumPct - a.aumPct)[0];
        const out1 = [...sectors].sort((a, b) => a.fortnightCr - b.fortnightCr)[0];
        await sendTelegramPhotos([{ png: await renderSectorCard(sectors, asOf), name: `sectors-${asOf}` }], [
          `FPI sector snapshot — NSDL report, period ending ${fmtDate(asOf)}`,
          `${top.name} is the largest FPI holding at ${top.aumPct.toFixed(1)}%.`,
          `Biggest fortnight outflow: ${out1.name} (${cr(out1.fortnightCr)}).`,
          '',
          `Sector-wise FPI data → ${link('/tools/fii-dii/sectors')}`,
        ].join('\n'));
        out.sectors = { posted: asOf };
      } catch (e) {
        await store.del(key);
        throw e;
      }
    } else {
      out.sectors = { posted: false, asOf, fresh: !!fresh };
    }
  } catch (e) {
    out.sectors = { error: (e as Error).message };
  }

  // 3. Morning check: is the last trading day fully logged?
  if (morning) {
    try {
      const day = lastWeekdayIst();
      if (await isTradingDay(day)) {
        const [cash, fno] = await Promise.all([getCashDays(), getFnoDays()]);
        const missing = [
          cash.some((r) => r.date === day) ? '' : 'cash (FII/DII net buy/sell)',
          fno.some((r) => r.date === day) ? '' : 'F&O open interest',
        ].filter(Boolean);
        if (missing.length && (!store || (await store.set(`fii-dii:tg:alert:${day}`, '1', { nx: true, ex: 60 * 60 * 24 * 10 })) === 'OK')) {
          const [y, m, d] = day.split('-');
          await sendTelegramMessage([
            `Chartix FII/DII alert: data missing for ${Number(d)} ${MONTHS[Number(m) - 1]} ${y}.`,
            `Missing: ${missing.join(' and ')}.`,
            missing.includes('F&O open interest')
              ? 'F&O will be filled automatically on the next run if NSE has published the file.'
              : 'NSE only shows the latest session, so this cash day may need to be added manually.',
            `Check: ${PUBLIC_SITE}/tools/fii-dii/history`,
          ].join('\n'));
          out.alert = { sent: day, missing };
        } else {
          out.alert = { sent: false, day, complete: missing.length === 0 };
        }
      } else {
        out.alert = { sent: false, reason: 'not a trading day' };
      }
    } catch (e) {
      out.alert = { error: (e as Error).message };
    }
  }

  return out;
}
