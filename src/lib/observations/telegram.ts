// Sends Market Desk posts to the owner's Telegram (@Chartix_postbot), each card
// as a photo with its ready-to-post X text as the caption. Posts go out in
// tranches through the day; sentAt marks what has already been delivered.

import type { MarketObservation } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { sendTelegramMessage, sendTelegramPhotos, telegramConfigured } from '@/lib/telegram';
import { renderCardPng } from './card-png';
import { fmtDay } from './stats';
import type { Slot } from './run';

const HOW_TO = 'Save the image, copy its caption, post on X. Put the chartix.in link in your first reply.';

async function deliver(rows: MarketObservation[], header: string) {
  await sendTelegramMessage(header);
  const sent: string[] = [];
  const failed: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const png = renderCardPng(r.chartSvg);
      const buf = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
      await sendTelegramPhotos([{ png: buf, name: `desk-${r.date}-${i + 1}` }], r.postText ?? r.headline);
      await prisma.marketObservation.update({ where: { id: r.id }, data: { sentAt: new Date() } });
      sent.push(r.metricName);
    } catch (e) {
      console.error(`[market-desk] telegram send failed for ${r.metricName}:`, e);
      failed.push(r.metricName);
    }
  }
  return { sent: sent.length, failed };
}

const slotWhere = (slot: Slot) => (slot === 'morning' ? { OR: [{ slot: 'morning' }, { slot: null }] } : { slot });

/** Sends the next `count` unsent posts of a slot, strongest first. */
export async function sendDeskTranche(date: string, slot: Slot, count: number, label: string) {
  if (!telegramConfigured()) return { skipped: 'Telegram not configured' };
  const rows = await prisma.marketObservation.findMany({
    where: { date, sentAt: null, ...slotWhere(slot) },
    orderBy: { score: 'desc' },
    take: count,
  });
  if (!rows.length) return { skipped: `No unsent ${slot} posts for ${date}` };
  return deliver(rows, `Market Desk · ${label} · ${fmtDay(date)}\n\n${rows.length} post${rows.length > 1 ? 's' : ''} for now. ${HOW_TO}`);
}

/** Admin "Send to Telegram": everything from the latest run, sent or not. */
export async function sendDeskToTelegram(date: string) {
  if (!telegramConfigured()) return { skipped: 'Telegram not configured' };
  const rows = await prisma.marketObservation.findMany({ where: { date }, orderBy: { score: 'desc' } });
  if (!rows.length) return { skipped: `No Market Desk posts for ${date}` };
  return deliver(rows, `Market Desk · ${fmtDay(date)} (manual send)\n\n${rows.length} posts, strongest first. ${HOW_TO}`);
}
