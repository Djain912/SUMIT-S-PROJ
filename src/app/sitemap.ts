import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { prisma } from '@/lib/db/prisma';

const INDICATOR_KEYS = [
  'roc', 'macd', 'rsi', 'stochastics', 'adl', 'mfi', 'ppo',
  'dmi', 'obv', 'cmf', 'rvol', 'sma', 'ema', 'lwma', 'wilderma', 'distma', 'bb',
];

const staticRoutes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/',                    priority: 1.0, changeFrequency: 'weekly'  },
  { path: '/pricing',             priority: 0.9, changeFrequency: 'monthly' },
  { path: '/blog',                priority: 0.8, changeFrequency: 'weekly'  },
  { path: '/tools',               priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/index-builder', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/fii-dii',       priority: 0.8, changeFrequency: 'daily'   },
  { path: '/about',               priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact',             priority: 0.4, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteConfig.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // One URL per indicator calculator
  const indicatorEntries: MetadataRoute.Sitemap = INDICATOR_KEYS.map((key) => ({
    url: `${siteConfig.url}/tools/${key}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Blog posts — queried live so every new publish is instantly in the sitemap
  // without any code change.
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    blogEntries = posts.map((p) => ({
      url: `${siteConfig.url}/blog/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — omit blog entries gracefully
  }

  return [...staticEntries, ...indicatorEntries, ...blogEntries];
}
