/**
 * Seed: Daily Question #1 — ATR-based entry, stop & measured move target
 * Chart: MMYT monthly — 13-year rectangle breakout
 *
 * Inserted into:
 *   Level 1 → Unit IV: Chart Pattern Analysis (unit-iv-chart-pattern-analysis)
 *   Level 2 → Unit IV: Chart Pattern Analysis (unit-iv-chart-pattern-analysis)
 *
 * Run: node prisma/seed-daily-question-1-mmyt.mjs
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

const PROMPT = 'A stock has been consolidating in a rectangle between $11.5 (support) and $41.5 (resistance) for 13 years. The ATR-14 on the monthly timeframe is $4.20. Price has just closed a monthly candle above $41.5 for the first time. A trader uses these rules: Entry = 1 ATR pullback from the breakout level; Stop-loss = 1 ATR below the entry price; Target = measured move (range height added to breakout level). What are the correct Entry, Stop-loss, and Target?';

const OPTIONS = [
  { text: 'Entry: $37.30 | Stop: $33.10 | Target: $67.30', correct: false },
  { text: 'Entry: $37.30 | Stop: $11.50 | Target: $71.50', correct: false },
  { text: 'Entry: $45.70 | Stop: $41.50 | Target: $71.50', correct: false },
  { text: 'Entry: $37.30 | Stop: $33.10 | Target: $71.50', correct: true  },
];

const EXPLANATION =
  'Entry = Breakout level − 1 ATR = $41.5 − $4.20 = $37.30. ' +
  'Stop = Entry − 1 ATR = $37.30 − $4.20 = $33.10. ' +
  'Target = Breakout level + Range height = $41.5 + ($41.5 − $11.5) = $41.5 + $30 = $71.50. ' +
  'Option A uses the entry price ($37.30) instead of the breakout level ($41.5) for the measured move target, giving the wrong target of $67.30. ' +
  'Option B uses the range low ($11.50) as the stop instead of an ATR-based stop. ' +
  'Option C enters 1 ATR above the breakout (momentum entry) rather than waiting for a 1 ATR pullback below it.';

async function main() {
  const levels = ['LEVEL_1', 'LEVEL_2'];
  const chapterSlug = 'unit-iv-chart-pattern-analysis';

  for (const level of levels) {
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

    console.log(`✅  Inserted into ${level} | Chapter: ${chapterSlug} | ID: ${question.id}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
