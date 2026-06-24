import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';

const SITE_URL = siteConfig.url; // https://chartix.in
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`; // dynamic branded fallback (1200×630)

/**
 * Transforms a Cloudinary image URL to a fixed 1200×630 crop.
 * Non-Cloudinary URLs are returned as-is.
 */
function toOgImage(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  // Insert c_fill,w_1200,h_630 transformation after /upload/
  return url.replace('/upload/', '/upload/c_fill,w_1200,h_630/');
}

interface BlogMetadataInput {
  title: string;
  description?: string | null;
  slug: string;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  tags?: string[];
}

/**
 * Generates fully-populated Metadata for a blog post.
 * All OG/Twitter image URLs are absolute and Cloudinary images
 * are resized to the recommended 1200×630 crop.
 */
export function generateBlogMetadata({
  title,
  description,
  slug,
  coverImageUrl,
  publishedAt,
  updatedAt,
  tags = [],
}: BlogMetadataInput): Metadata {
  const canonicalUrl = `${SITE_URL}/blog/${slug}`;
  const ogImage = coverImageUrl ? toOgImage(coverImageUrl) : DEFAULT_OG_IMAGE;
  const desc = description ?? `Read "${title}" on the Chartix blog — CMT exam prep and technical analysis insights.`;

  return {
    title,
    description: desc,
    keywords: tags.length ? tags : undefined,
    alternates: { canonical: canonicalUrl },

    openGraph: {
      type: 'article',
      siteName: siteConfig.name,
      title,
      description: desc,
      url: canonicalUrl,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedAt ? { publishedTime: publishedAt.toISOString() } : {}),
      ...(updatedAt ? { modifiedTime: updatedAt.toISOString() } : {}),
      authors: [SITE_URL],
      tags,
    },

    twitter: {
      card: 'summary_large_image',
      site: '@Sumit_jain01',
      title,
      description: desc,
      images: [ogImage],
    },
  };
}
