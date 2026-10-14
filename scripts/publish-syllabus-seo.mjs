// Publishes the CMT Syllabus 2026 post with SEO tuning + internal links from related posts.
// Facts come only from the official 2026 CMT Program Guide (CMT Association).
// Run: node scripts/publish-syllabus-seo.mjs   (re-runnable — all inserts are marker-guarded)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SLUG = 'cmt-syllabus-2026';
const URL_PATH = '/blog/cmt-syllabus-2026';

const TITLE = 'CMT Syllabus 2026: Level 1, 2 & 3 Topics & Weightage';
const EXCERPT =
  'Full CMT syllabus 2026 from the official Program Guide: every Level 1, 2 and 3 chapter, exam format (132 questions at Level 1) and topic weightage.';

// h3 question + single <p> answer, which the blog page turns into FAQPage schema.
const faq = [
  ['What is the CMT Level 1 syllabus?',
   'Level 1 has 12 sections plus Ethics: Theory and History, Charts, Trend Analysis, Chart Pattern Analysis, Technical Indicators, Statistics for Technicians, Behavioral Finance, Sentiment, Cycle Analysis, Comparative Market Analysis, Volatility Analysis, and Systems and Quantitative Methods.'],
  ['How many questions are on the CMT Level 1 exam?',
   'The CMT Level 1 exam has 132 multiple-choice questions, of which 120 are scored. The remaining 12 are trial questions being tested for future use. You have 2 hours to complete it.'],
  ['How many questions are on the CMT Level 2 exam?',
   'The CMT Level 2 exam has 170 multiple-choice questions, of which 150 are scored and 20 are trial questions. You have 4 hours to complete it.'],
  ['What is the format of the CMT Level 3 exam?',
   'Level 3 combines multiple-choice and short-answer questions, with most responses open-ended. It has about 50–60 questions organised in groups of three to seven items, and you have 4 hours.'],
  ['What is the difference between CMT Level 1, Level 2 and Level 3?',
   'Level 1 tests foundational principles: the concepts, definitions and tools of technical analysis. Level 2 tests applying those methods to identify opportunities and manage risk. Level 3 tests the work of a technical analyst: integrating concepts and tools to analyse market action and manage positions and risk.'],
  ['Which topics carry the most weight in CMT Level 1?',
   'Theory and History is the largest knowledge domain at 38%, followed by Classical Techniques at 33%, Advanced Techniques at 26% and Ethics at 3%.'],
  ['How many hours should I study for each CMT level?',
   'The CMT Program Guide suggests 40 to 100 hours for Level 1, 100 to 140 hours for Level 2 and 120 to 160 hours for Level 3.'],
  ['Is Ethics part of the CMT exam?',
   'Yes. Ethics is tested on all three levels (3% at Levels 1 and 2, 5% at Level 3). The CMT Association has adopted the CFA Institute Code of Ethics and Standards of Professional Conduct, and ethics is not covered in the CMT textbooks, so study the Standards of Practice Handbook.'],
  ['How is the CMT exam delivered?',
   'The exam is taken on a computer at a Prometric testing facility or remotely through Prometric ProProctor. Schedule your exam well in advance.'],
];

const FAQ_MARKER = 'seo-faq-syllabus-v1';
const FAQ_HTML = `<!-- ${FAQ_MARKER} -->
<h2>CMT syllabus FAQs</h2>
${faq.map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`).join('\n')}
`;

const linkBox =
  'margin:24px 0;padding:16px 20px;border-left:4px solid #10b981;background:#f0fdf4;border-radius:8px;';

// Insert before the trailing disclaimer paragraph when there is one; otherwise append.
function insertBeforeDisclaimer(html, block) {
  const idx = html.lastIndexOf('<p');
  const tail = idx === -1 ? '' : html.slice(idx);
  if (idx !== -1 && /Participating Prep Provider|Disclaimer/i.test(tail)) {
    return html.slice(0, idx) + block + '\n' + html.slice(idx);
  }
  return html + '\n' + block;
}

const linkBlock = (text) =>
  `<!-- seo-syllabus-link-v1 -->\n<div style="${linkBox}">${text}</div>`;

const LINK_UPDATES = [
  {
    slug: 'cmt-level-1-complete-guide-2026',
    apply: (html) =>
      html.includes('<p>Then test yourself:')
        ? html.replace(
            '<p>Then test yourself:',
            `<p>Want the official topic list? See the <a href="${URL_PATH}">complete CMT syllabus for Levels 1, 2 and 3</a>.</p>\n<p>Then test yourself:`,
          )
        : insertBeforeDisclaimer(html, linkBlock(`<strong>Official topic list:</strong> see the <a href="${URL_PATH}">complete CMT syllabus for Levels 1, 2 and 3</a>.`)),
  },
  {
    slug: 'what-is-cmt',
    apply: (html) => {
      const from = 'See the <a href="/blog/cmt-level-1-complete-guide-2026">full CMT Level 1 syllabus and exam guide</a>.';
      return html.includes(from)
        ? html.replace(
            from,
            `See the <a href="${URL_PATH}">complete CMT syllabus for all three levels</a> and the <a href="/blog/cmt-level-1-complete-guide-2026">Level 1 guide</a>.`,
          )
        : insertBeforeDisclaimer(html, linkBlock(`<strong>Syllabus:</strong> see the <a href="${URL_PATH}">complete CMT syllabus for all three levels</a>.`));
    },
  },
  {
    slug: 'complete-guide-to-cmt-level-2',
    apply: (html) =>
      insertBeforeDisclaimer(html, linkBlock(`<strong>Official topic list:</strong> every Level 2 section and chapter is in the <a href="${URL_PATH}">complete CMT syllabus 2026</a>.`)),
  },
  {
    slug: 'cmt-level-1-practice-questions',
    apply: (html) =>
      insertBeforeDisclaimer(html, linkBlock(`<strong>Know what to study:</strong> see the <a href="${URL_PATH}">CMT Level 1 syllabus and topic weightage</a> to focus your practice.`)),
  },
  {
    slug: 'cmt-level-2-practice-questions',
    apply: (html) =>
      insertBeforeDisclaimer(html, linkBlock(`<strong>Know what to study:</strong> see the <a href="${URL_PATH}">CMT Level 2 syllabus and topic weightage</a> to focus your practice.`)),
  },
];

async function main() {
  // 1) the syllabus post itself
  const post = await prisma.blogPost.findUnique({ where: { slug: SLUG } });
  if (!post) throw new Error(`${SLUG} not found`);

  let html = post.contentHtml;
  if (!html.includes(FAQ_MARKER)) {
    const anchor = '<h2>What about fees and exam dates?</h2>';
    if (!html.includes(anchor)) throw new Error('anchor h2 not found');
    html = html.replace(anchor, FAQ_HTML + anchor);
  }

  await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      title: TITLE,
      excerpt: EXCERPT,
      contentHtml: html,
      isPublished: true,
      publishedAt: post.publishedAt ?? new Date(),
    },
  });
  console.log(`✅ Published /blog/${SLUG}`);

  // 2) internal links from related posts
  for (const u of LINK_UPDATES) {
    const p = await prisma.blogPost.findUnique({ where: { slug: u.slug } });
    if (!p) { console.log(`⚠️  ${u.slug} not found`); continue; }
    if (p.contentHtml.includes(URL_PATH)) { console.log(`=  ${u.slug} already links`); continue; }
    await prisma.blogPost.update({ where: { id: p.id }, data: { contentHtml: u.apply(p.contentHtml) } });
    console.log(`✅  linked from ${u.slug}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
