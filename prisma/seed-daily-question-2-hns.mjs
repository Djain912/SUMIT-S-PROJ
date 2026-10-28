/**
 * Seed: Daily Question #2 — Head and shoulders top: identify pattern + minimum target
 * Chart: ArcelorMittal 4h
 * Inserted into Unit IV: Chart Pattern Analysis for LEVEL_1 and LEVEL_2
 *
 * Run: node prisma/seed-daily-question-2-hns.mjs
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
  'A stock forms three successive peaks at approximately $65.30, $68.56 and $66.00. Between the peaks, price pulls back to the same horizontal support at $62.30, and then closes below that support. Identify the pattern and calculate the minimum price target.';

const OPTIONS = [
  { text: 'Head and shoulders top | Target: $58.60', correct: false },
  { text: 'Head and shoulders top | Target: $56.04', correct: true },
  { text: 'Triple top | Target: $56.04', correct: false },
  { text: 'Head and shoulders top | Target: $59.30', correct: false },
];

const EXPLANATION =
  'The middle peak ($68.56) is clearly the highest, with a lower peak on each side ($65.30 and $66.00), so this is a head and shoulders top with a neckline at $62.30. ' +
  'Height = head − neckline = $68.56 − $62.30 = $6.26. Target = neckline − height = $62.30 − $6.26 = $56.04. ' +
  'Option A uses the right shoulder as the height ($66.00 − $62.30 = $3.70, giving $58.60) and option D uses the left shoulder ($65.30 − $62.30 = $3.00, giving $59.30); the height must be measured from the head. ' +
  'Option C has the right target but the wrong pattern: a triple top needs three peaks at about the same level, and here the middle peak is clearly higher.';

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
