/**
 * Seed: Daily Question #3 — Morning doji star: identify pattern + stance
 * Chart: Dow Jones Industrial Average, daily
 * Inserted into Unit IV: Chart Pattern Analysis for LEVEL_1 and LEVEL_2
 *
 * Run: node prisma/seed-daily-question-3-morning-star.mjs
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
  'You are a fund manager who has been underweight an equity index through a sharp multi-week decline. Three daily candles then form in sequence: (1) a long red candle; (2) a doji with a long lower shadow whose range overlaps the red candle\'s range; (3) a long green candle that opens above the doji\'s body and closes above the open of the first red candle. Name the pattern and choose the most appropriate stance.';

const OPTIONS = [
  { text: "Bullish abandoned baby | Go fully long; stop below the doji's low", correct: false },
  { text: "Morning doji star | Go fully long now; stop just below the green candle's low", correct: false },
  { text: "Morning doji star | Start a partial long; stop below the doji's low; add only as other tools confirm", correct: true },
  { text: "Bullish engulfing | Start a partial long; stop below the doji's low; add only as other tools confirm", correct: false },
];

const EXPLANATION =
  'A long red candle in a downtrend, a doji with a long lower shadow, and a long green candle that closes above the open of the first candle form a morning doji star, a bullish reversal pattern. ' +
  'A candlestick pattern is a signal, not a full trade plan: start with a partial long, place the stop below the doji\'s low (the extreme of the pattern, since a break below it invalidates the setup), and add only as other technical tools confirm, such as support, momentum divergence or a break of the prior swing high. ' +
  'Option A is wrong because an abandoned baby needs the doji to gap away from both neighbouring candles, but here the doji overlaps the first candle\'s range; committing fully on a candle signal alone is also over-commitment. ' +
  'Option B has the right pattern but the stop just below the green candle\'s low sits inside the pattern\'s range, so a normal retest of the doji would stop the trade out, and a full position ignores confirmation. ' +
  'Option D has the right stance but the wrong pattern: a bullish engulfing is a two-candle pattern in which the second body engulfs the first, whereas here the green body sits above the doji.';

async function main() {
  const chapterSlug = 'unit-iv-chart-pattern-analysis';

  for (const level of ['LEVEL_1', 'LEVEL_2']) {
    const chapter = await prisma.chapter.findFirst({
      where: { slug: chapterSlug, level },
      select: { id: true },
    });

    if (!chapter) {
      console.log(`⚠️  Chapter not found for ${level} — skipping`);
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

    console.log(`✅  Inserted into ${level} | ${chapterSlug} | ID: ${question.id}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
