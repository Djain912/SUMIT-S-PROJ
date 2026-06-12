import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

// AI / LLM training and scraping bots — blocked entirely so Chartix content
// is not ingested for model training or AI answer engines. Search engine bots
// (Googlebot, Bingbot) stay allowed: they drive sign-ups via SEO.
const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
  'omgili',
  'omgilibot',
  'ImagesiftBot',
  'cohere-ai',
  'cohere-training-data-crawler',
  'Timpibot',
  'YouBot',
  'AI2Bot',
  'PetalBot',
  'Scrapy',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/user/', '/api/', '/auth/'],
      },
      ...AI_BOTS.map((bot) => ({ userAgent: bot, disallow: '/' })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
