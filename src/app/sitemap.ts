import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

const publicRoutes = [
  { path: '/', priority: 1 },
  { path: '/about', priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route.priority,
  }));
}
