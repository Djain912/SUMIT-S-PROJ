// Sends a Market Desk run to the owner's Telegram (@Chartix_postbot): a short
// header, then one photo per post with the ready-to-post X text as its caption,
// so each card can be copied or forwarded straight to X.

import { prisma } from '@/lib/db/prisma';
import { sendTelegramMessage, sendTelegramPhotos, telegramConfigured } from '@/lib/telegram';
import { renderCardPng } from './card-png';
import { fmtDay } from './stats';

export async function sendDeskToTelegram(date: string) {
  if (!telegramConfigured()) return { skipped: 'Telegram not configured' };
  const rows = await prisma.marketObservation.findMany({ where: { date }, orderBy: { score: 'desc' } });
  if (!rows.length) return { skipped: `No Market Desk posts for ${date}` };

  await sendTelegramMessage(
    `Market Desk · ${fmtDay(date)}\n\n${rows.length} posts ready, strongest first. ` +
      `Post 2–3 today (around 8:30 AM, 1 PM and 7 PM IST): save the image, copy its caption, post on X. ` +
      `Put the chartix.in link in your first reply.`,
  );

  const sent: string[] = [];
  const failed: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const png = renderCardPng(r.chartSvg);
      const buf = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
      await sendTelegramPhotos([{ png: buf, name: `desk-${date}-${i + 1}` }], r.postText ?? r.headline);
      sent.push(r.metricName);
    } catch (e) {
      console.error(`[market-desk] telegram send failed for ${r.metricName}:`, e);
      failed.push(r.metricName);
    }
  }
  return { sent: sent.length, failed };
}
