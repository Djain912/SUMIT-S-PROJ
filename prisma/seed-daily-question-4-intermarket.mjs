/**
 * Seed: Daily Question #4 — Intermarket analysis: DXY breakdown + Gold bounce
 * Charts: U.S. Dollar Index (DXY) daily + Gold (XAU/USD) daily
 * Inserted into Unit X: Comparative Market Analysis for LEVEL_1 and LEVEL_2
 *
 * Run: node prisma/seed-daily-question-4-intermarket.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
}

const prisma = new PrismaClient();

function doc(text) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

const PROMPT =
  'You are a commodity analyst tracking the U.S. Dollar Index (DXY) and Gold (XAU/USD) on daily charts. DXY has broken below a multi-week horizontal support near 100.50, closing at 99.99. Simultaneously, Gold has bounced sharply off support near $4,054 and is now trading at $4,141, approaching horizontal resistance at $4,200. Based on classical intermarket principles, which of the following is the most appropriate trade recommendation?';

const OPTIONS = [
  { text: "Short Gold; the dollar breakdown is a false move and will reverse, pressuring Gold lower", correct: false },
  { text: "Long Gold with a target of $4,200; stop below $4,054; the dollar breakdown confirms Gold's bullish reversal from support", correct: true },
  { text: "Long DXY; the support break is a bear trap and Gold's rally will exhaust at $4,200", correct: false },
  { text: "Short both DXY and Gold; both are in downtrends and will continue lower together", correct: false },
];

const EXPLANATION =
  'The inverse correlation between the U.S. Dollar and Gold is a foundational intermarket relationship. When DXY breaks below key support (100.50), it weakens the currency in which Gold is priced, making Gold cheaper for foreign buyers and increasing demand — a bullish catalyst for Gold. ' +
  "Gold's bounce off $4,054 support, combined with the dollar's confirmed breakdown, gives a textbook intermarket confirmation: dollar weakness validates Gold strength. The trade is long Gold targeting resistance at $4,200, with a stop below the $4,054 support that initiated the bounce. " +
  'Option A ignores the confirmed support break in DXY and assumes reversal without evidence. ' +
  'Option C has no technical basis — calling a bear trap requires a quick reclaim of the broken level, which has not happened. ' +
  'Option D is wrong because Gold and the dollar rarely trend in the same direction; their inverse relationship means a dollar downtrend typically supports Gold upside, not a Gold downtrend.';

async function main() {
  // Try the intermarket / comparative analysis chapter first, fall back to chart pattern analysis
  const slugs = [
    'unit-x-comparative-market-analysis',
    'unit-x-intermarket-analysis',
    'unit-iv-chart-pattern-analysis',
  ];

  for (const level of ['LEVEL_1', 'LEVEL_2']) {
    let chapter = null;
    for (const slug of slugs) {
      chapter = await prisma.chapter.findFirst({
        where: { slug, level },
        select: { id: true, slug: true },
      });
      if (chapter) break;
    }

    if (!chapter) {
      // Last resort: find any chapter with "comparative" or "intermarket" in the title
      chapter = await prisma.chapter.findFirst({
        where: {
          level,
          OR: [
            { title: { contains: 'Comparative', mode: 'insensitive' } },
            { title: { contains: 'Intermarket', mode: 'insensitive' } },
          ],
        },
        select: { id: true, slug: true },
      });
    }

    if (!chapter) {
      console.log(`⚠️  No suitable chapter found for ${level} — skipping`);
      continue;
    }

    const question = await prisma.question.create({
      data: {
        level,
        chapterId: chapter.id,
        promptJson: doc(PROMPT),
        explanationJson: doc(EXPLANATION),
        questionType: 'SINGLE_CHOICE',
        difficulty: 'HARD',
        isPublished: true,
        options: {
          create: OPTIONS.map((o, i) => ({
            contentJson: doc(o.text),
            isCorrect: o.correct,
            orderIndex: i + 1,
          })),
        },
      },
    });

    console.log(`✅  Inserted into ${level} | ${chapter.slug} | ID: ${question.id}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
