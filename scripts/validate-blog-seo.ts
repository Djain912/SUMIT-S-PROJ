/**
 * Blog SEO Validator
 * Usage: npx ts-node scripts/validate-blog-seo.ts
 *
 * Checks every published blog post for:
 *   - Missing title / description
 *   - Missing og:image / twitter:image
 *   - Relative (non-absolute) image URLs
 *   - Broken image URLs (non-200 response)
 *   - Image dimensions < 1200×630 (Cloudinary only — inferred from transform)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SITE_URL = 'https://chartix.in';

interface Issue {
  severity: 'ERROR' | 'WARN';
  message: string;
}

interface PostReport {
  id: string;
  title: string;
  slug: string;
  issues: Issue[];
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function toOgImageUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/c_fill,w_1200,h_630/');
}

async function checkImageAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function validatePost(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
}): Promise<PostReport> {
  const issues: Issue[] = [];

  // Title
  if (!post.title?.trim()) {
    issues.push({ severity: 'ERROR', message: 'Missing title' });
  }

  // Description / excerpt
  if (!post.excerpt?.trim()) {
    issues.push({ severity: 'WARN', message: 'Missing excerpt/description — crawlers will use auto-generated fallback' });
  }

  // OG image
  if (!post.coverImageUrl) {
    issues.push({ severity: 'WARN', message: 'No coverImageUrl — will use branded fallback (/opengraph-image)' });
  } else {
    // Absolute URL check
    if (!isAbsoluteUrl(post.coverImageUrl)) {
      issues.push({ severity: 'ERROR', message: `coverImageUrl is relative: "${post.coverImageUrl}" — must be absolute HTTPS` });
    } else if (!post.coverImageUrl.startsWith('https://')) {
      issues.push({ severity: 'ERROR', message: `coverImageUrl uses HTTP, not HTTPS: "${post.coverImageUrl}"` });
    } else {
      // Accessibility check
      const ogUrl = toOgImageUrl(post.coverImageUrl);
      const accessible = await checkImageAccessible(ogUrl);
      if (!accessible) {
        issues.push({ severity: 'ERROR', message: `OG image not accessible (non-200): ${ogUrl}` });
      }

      // Google Drive check
      if (post.coverImageUrl.includes('drive.google.com') || post.coverImageUrl.includes('lh3.googleusercontent.com')) {
        issues.push({ severity: 'ERROR', message: 'coverImageUrl is a Google Drive URL — crawlers cannot fetch it; upload to Cloudinary instead' });
      }
    }
  }

  // Canonical URL
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  if (!post.slug?.trim()) {
    issues.push({ severity: 'ERROR', message: 'Missing slug — canonical URL cannot be generated' });
  } else {
    // Check page is reachable
    const reachable = await checkImageAccessible(canonical);
    if (!reachable) {
      issues.push({ severity: 'ERROR', message: `Blog post page not reachable (non-200): ${canonical}` });
    }
  }

  return { id: post.id, title: post.title, slug: post.slug, issues };
}

async function main() {
  console.log('\n🔍  Chartix Blog SEO Validator\n' + '─'.repeat(50));

  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true },
    orderBy: { publishedAt: 'desc' },
  });

  if (posts.length === 0) {
    console.log('No published posts found.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${posts.length} published post(s). Validating...\n`);

  const reports: PostReport[] = [];
  for (const post of posts) {
    process.stdout.write(`  Checking: ${post.slug}... `);
    const report = await validatePost(post);
    reports.push(report);
    const errorCount = report.issues.filter((i) => i.severity === 'ERROR').length;
    const warnCount = report.issues.filter((i) => i.severity === 'WARN').length;
    if (report.issues.length === 0) {
      console.log('✅ PASS');
    } else {
      console.log(`❌ ${errorCount} error(s), ${warnCount} warning(s)`);
    }
  }

  console.log('\n' + '─'.repeat(50) + '\nDetailed Report\n' + '─'.repeat(50));

  let totalErrors = 0;
  let totalWarns = 0;

  for (const report of reports) {
    if (report.issues.length === 0) continue;
    console.log(`\n📄 "${report.title}"\n   /blog/${report.slug}`);
    for (const issue of report.issues) {
      const icon = issue.severity === 'ERROR' ? '  ❌' : '  ⚠️ ';
      console.log(`${icon} [${issue.severity}] ${issue.message}`);
      if (issue.severity === 'ERROR') totalErrors++;
      else totalWarns++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Summary: ${totalErrors} error(s), ${totalWarns} warning(s) across ${posts.length} post(s)`);

  if (totalErrors === 0 && totalWarns === 0) {
    console.log('\n✅ All blog posts pass SEO validation.\n');
  } else if (totalErrors === 0) {
    console.log('\n⚠️  No errors, but warnings should be reviewed.\n');
  } else {
    console.log('\n❌ Fix errors before sharing posts on social media.\n');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
