// Fix SEO titles & excerpts for high-impression / low-CTR blog posts
// Source: Google Search Console data export, Oct 2026
// Run: node scripts/fix-seo-titles-excerpts.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXES = [
  {
    slug: 'what-is-cmt',
    // Was getting 2,526 impressions at pos 8.24 but only 0.32% CTR — worst ratio on the site.
    // Title was too generic; meta description was missing numbers and specifics.
    title: 'What is the CMT Certification? Complete Guide 2026',
    excerpt:
      'The CMT (Chartered Market Technician) is the gold-standard designation in technical analysis, awarded by the CMT Association. Learn the 3-level exam structure, eligibility, costs, passing rates, and whether CMT is worth it — with real salary data from India and global markets.',
  },
  {
    slug: 'salary-after-cmt',
    // Was getting 3,471 impressions. Ranked pos 5.14 but only 1.73% CTR.
    // People click salary pages when they see numbers in the title.
    title: 'CMT Salary in India 2026: ₹8L–₹40L+ Range — Real Data',
    excerpt:
      'How much do CMT charterholders actually earn in India? From fresh analyst roles at ₹6–10 LPA to senior positions above ₹40 LPA, this guide breaks down CMT salaries by role, experience level, and city — plus global salary benchmarks and how CMT compares to CFA in earning potential.',
  },
  {
    slug: 'cmt-level-1-formulas-explained',
    // Had 236 impressions at pos 7.83 with 0 clicks. Title not matching search intent.
    // Searchers want a cheat sheet / quick reference, not just "explained".
    title: 'CMT Level 1 Formulas Cheat Sheet 2026 — All Key Formulas',
    excerpt:
      'Every formula you need for the CMT Level 1 exam in one place: moving averages, RSI, MACD, Bollinger Bands, Stochastics, ADX, and more — each with the formula, step-by-step calculation, and a worked example. Bookmark this as your CMT Level 1 formula reference.',
  },
  {
    slug: 'point-and-figure-charting-complete-guide',
    // 1,237 impressions, only 0.40% CTR at pos 12.26 — too far down page 1.
    // Better excerpt to drive clicks when it does appear.
    title: 'Point and Figure Charting: The Complete CMT Guide',
    excerpt:
      'Point and Figure charts strip out time and minor noise to show pure price action. This complete guide covers box size, reversal criteria, P&F buy/sell signals, price targets, and how P&F is tested on the CMT Level 1 and Level 2 exams — with annotated chart examples throughout.',
  },
];

async function main() {
  console.log('\n🔧  Chartix Blog SEO Fix — Titles & Excerpts');
  console.log('─'.repeat(55));
  console.log(`Updating ${FIXES.length} posts...\n`);

  for (const fix of FIXES) {
    const existing = await prisma.blogPost.findFirst({
      where: { slug: fix.slug },
      select: { id: true, title: true, excerpt: true, isPublished: true },
    });

    if (!existing) {
      console.log(`⚠️  SKIP  /blog/${fix.slug} — post not found in database`);
      continue;
    }

    await prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        title: fix.title,
        excerpt: fix.excerpt,
        updatedAt: new Date(),
      },
    });

    console.log(`✅  /blog/${fix.slug}`);
    console.log(`    Title:   ${fix.title}`);
    console.log(`    Excerpt: ${fix.excerpt.slice(0, 80)}…\n`);
  }

  console.log('─'.repeat(55));
  console.log('Done. Deploy to production for changes to take effect.\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
