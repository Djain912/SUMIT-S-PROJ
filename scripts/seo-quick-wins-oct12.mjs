// SEO quick wins from Search Console export (Jun 1 – Oct 11, 2026)
// Run: node scripts/seo-quick-wins-oct12.mjs   (safe to re-run — blocks are marker-guarded)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const box = 'margin:32px 0;padding:20px 24px;border:1px solid #d1fae5;border-radius:12px;background:#f0fdf4;';

const LEVEL1_LINKS = `<!-- seo-links-v1 -->
<div style="${box}">
<h2>Practise what you just read</h2>
<p>Every indicator in the Level 1 syllabus has a free interactive calculator on Chartix — see the formula work step by step:</p>
<ul>
<li><a href="/tools/rsi">RSI Calculator</a> — average gain, average loss and the RS ratio</li>
<li><a href="/tools/macd">MACD Calculator</a> — 12/26 EMA, signal line and histogram</li>
<li><a href="/tools/bb">Bollinger Bands Calculator</a> — middle band and ±2 standard deviations</li>
<li><a href="/tools/sma">Simple Moving Average</a> and <a href="/tools/ema">Exponential Moving Average</a></li>
<li><a href="/tools">All 17 indicator calculators →</a></li>
</ul>
<p>Then test yourself: <a href="/blog/cmt-level-1-practice-questions">100 CMT Level 1 practice questions with explanations</a> and the <a href="/blog/cmt-level-1-formulas-explained">Level 1 formula cheat sheet</a>.</p>
</div>`;

const WHAT_IS_CMT_FAQ = `<!-- seo-faq-v1 -->
<div style="${box}">
<h2>Quick answers: CMT FAQs</h2>
<h3>What is the full form of CMT?</h3>
<p>CMT stands for <strong>Chartered Market Technician</strong> — the professional designation in technical analysis awarded by the CMT Association (New York).</p>
<h3>What are the CMT course fees in India?</h3>
<p>Fees are charged in US dollars: a one-time enrollment fee of <strong>$250</strong>, annual membership of <strong>$325</strong>, and an exam fee per level of roughly <strong>$875 (early)</strong>, <strong>$1,075 (standard)</strong> or <strong>$1,475 (late)</strong>. Registering early is the cheapest route.</p>
<h3>When are the CMT Level 1 exam dates in 2026?</h3>
<p>CMT exams run in two windows each year — <strong>June and December</strong>. Exact dates and registration deadlines are published on cmtassociation.org.</p>
<h3>What is the CMT Level 1 syllabus?</h3>
<p>Level 1 covers theory and history of technical analysis, charts, trend analysis, chart patterns, indicators, statistics, behavioral finance, sentiment, cycles, intermarket analysis, volatility, systems and ethics. See the <a href="/blog/cmt-level-1-complete-guide-2026">full CMT Level 1 syllabus and exam guide</a>.</p>
</div>`;

const SALARY_US_FAQ = `<!-- seo-faq-us-v1 -->
<div style="${box}">
<h2>What is the CMT salary in the US?</h2>
<p>Indicative US ranges for technical analysis roles: entry-level analyst <strong>$60,000–$90,000</strong>, mid-level analyst <strong>$90,000–$150,000</strong>, senior analyst <strong>$150,000–$250,000</strong>, with experienced charterholders often above <strong>$200,000</strong>. Pay varies widely by firm, city and role.</p>
<p>New to the program? Start with <a href="/blog/what-is-cmt">what the CMT certification is</a> and the <a href="/blog/cmt-level-1-complete-guide-2026">CMT Level 1 guide</a>.</p>
</div>`;

const UPDATES = [
  {
    slug: 'cmt-level-1-complete-guide-2026',
    title: 'CMT Level 1 Syllabus, Books & Exam Guide 2026',
    excerpt:
      'Everything for CMT Level 1 in 2026: the full syllabus chapter by chapter, official books and study material, exam pattern (132 MCQs), fees, exam windows and a study plan — plus free practice tools.',
    block: LEVEL1_LINKS,
    marker: 'seo-links-v1',
  },
  { slug: 'what-is-cmt', block: WHAT_IS_CMT_FAQ, marker: 'seo-faq-v1' },
  {
    slug: 'salary-after-cmt',
    title: 'CMT Salary 2026: India (₹8L–₹40L+) & US ($60k–$200k+)',
    block: SALARY_US_FAQ,
    marker: 'seo-faq-us-v1',
  },
];

// Insert before the trailing disclaimer paragraph so it stays last.
function insertBlock(html, block) {
  const idx = html.lastIndexOf('<p');
  return idx === -1 ? html + block : html.slice(0, idx) + block + '\n' + html.slice(idx);
}

async function main() {
  for (const u of UPDATES) {
    const post = await prisma.blogPost.findUnique({ where: { slug: u.slug } });
    if (!post) { console.log(`⚠️  ${u.slug} not found`); continue; }

    const data = {};
    if (u.title) data.title = u.title;
    if (u.excerpt) data.excerpt = u.excerpt;
    if (!post.contentHtml.includes(u.marker)) data.contentHtml = insertBlock(post.contentHtml, u.block);

    if (Object.keys(data).length === 0) { console.log(`=  ${u.slug} already done`); continue; }
    await prisma.blogPost.update({ where: { id: post.id }, data });
    console.log(`✅  ${u.slug}: ${Object.keys(data).join(', ')}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
