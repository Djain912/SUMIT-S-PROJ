import { prisma } from '@/lib/db/prisma';

// Admin-defined captions for note images, keyed by image URL. These let an admin
// label images that have no alt text (e.g. candlestick charts) so the chatbot
// can pick the right diagram. Stored in the `image_captions` table.

export async function getImageCaptions(urls: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (urls.length === 0) return map;
  try {
    const rows = await prisma.$queryRawUnsafe<{ url: string; caption: string }[]>(
      `SELECT url, caption FROM image_captions WHERE url = ANY($1)`,
      urls,
    );
    for (const r of rows) {
      const caption = r.caption?.trim();
      if (caption) map.set(r.url, caption);
    }
  } catch (e) {
    // Table may not exist yet (migration not run) — degrade gracefully
    console.error('[image-captions] getImageCaptions error:', e);
  }
  return map;
}

export async function upsertImageCaption(url: string, caption: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO image_captions (url, caption, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (url)
     DO UPDATE SET caption = EXCLUDED.caption, updated_at = NOW()`,
    url,
    caption.trim().slice(0, 300),
  );
}
