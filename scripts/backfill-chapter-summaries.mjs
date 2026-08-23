/**
 * Generates missing Quick Revision Sheets for a level's published chapters.
 *
 * Level 2 launched with 0 of 13 summaries while Level 1 had all 13, so the
 * Summary tab was empty for every Level 2 student.
 *
 * Uses the exact same generator as the admin "Generate" button
 * (src/lib/chapter-summary/generate.ts) so bulk output cannot drift from what
 * the UI produces.
 *
 * Rows are written UNPUBLISHED. This is study material for paying candidates —
 * it gets reviewed in /admin/summary before it goes live.
 *
 *   node scripts/backfill-chapter-summaries.mjs --level=LEVEL_2 [--dry] [--force]
 *
 * Idempotent: chapters that already have a summary row are skipped unless
 * --force is passed.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const LEVEL = arg('level', 'LEVEL_2');
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

async function main() {
  const { generateChapterSummary } = await import('../src/lib/chapter-summary/generate.ts');

  const chapters = await prisma.chapter.findMany({
    where: { level: LEVEL, isPublished: true, isDeleted: false },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, orderIndex: true, title: true, summary: { select: { id: true, isPublished: true } } },
  });

  const todo = chapters.filter(c => FORCE || !c.summary);
  console.log(`${LEVEL}: ${chapters.length} published chapters, ${chapters.length - todo.length} already have a summary, ${todo.length} to generate.`);
  if (DRY) {
    todo.forEach(c => console.log(`  [dry] #${c.orderIndex} ${c.title}`));
    return;
  }

  let ok = 0, failed = 0;
  for (const c of todo) {
    process.stdout.write(`  #${String(c.orderIndex).padStart(2)} ${c.title.slice(0, 44).padEnd(46)} `);
    try {
      const data = await generateChapterSummary(c.id);
      const payload = {
        summary: data.summary, keyConcepts: data.keyConcepts, formulas: data.formulas,
        examTips: data.examTips, highYield: data.highYield, oneMinute: data.oneMinute,
        isPublished: false,
      };
      await prisma.chapterSummary.upsert({
        where: { chapterId: c.id },
        create: { chapterId: c.id, ...payload },
        update: payload,
      });
      console.log(`✓ ${data.summary.length} bullets, ${data.keyConcepts.length} concepts, ${data.formulas.length} formulas, ${data.examTips.length} tips`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }
  console.log(`\nGenerated ${ok}, failed ${failed}. All rows are UNPUBLISHED — review and publish in /admin/summary?level=${LEVEL}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
