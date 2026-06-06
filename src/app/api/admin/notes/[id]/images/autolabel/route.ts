import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { openai, CHAT_MODEL } from '@/lib/ai/openai';
import { parseStoredImage } from '@/lib/ai/rag';
import { getImageCaptions, upsertImageCaption } from '@/lib/ai/image-captions';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const LABEL_PROMPT = `You are labelling a technical-analysis chart image for a CMT (Chartered Market Technician) study platform.

Reply with ONLY a short label (3 to 8 words) naming the SPECIFIC chart pattern, candlestick pattern, or indicator this image depicts — for example "Bearish Engulfing Pattern" or "Head and Shoulders Top".

Rules:
- If a pattern name is printed inside the image, use that exact name.
- Be specific (e.g. "Bullish Piercing Pattern", not just "Candlestick Chart").
- If you genuinely cannot tell what specific concept it shows, reply exactly: UNCLEAR
- No quotes, no punctuation at the end, no extra words.`;

function cleanLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/^["'`]|["'`]$/g, '').replace(/[.\s]+$/, '').slice(0, 120).trim();
}

// POST /api/admin/notes/[id]/images/autolabel
// Uses vision to suggest a caption for each of the note's images that doesn't
// already have one. Saves the suggestions (admin can review/edit them after).
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    // Collect the note's distinct image URLs
    const rows = await prisma.$queryRawUnsafe<{ entry: string }[]>(
      `SELECT DISTINCT unnest(image_urls) AS entry FROM knowledge_chunks WHERE source_id = $1`,
      id,
    );
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const r of rows) {
      if (!r.entry) continue;
      const { url } = parseStoredImage(r.entry);
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }

    if (urls.length === 0) {
      return NextResponse.json({ success: true, data: { labelled: 0, skipped: 0, unclear: 0 } });
    }

    // Don't overwrite captions the admin already set
    const existing = await getImageCaptions(urls);
    const toLabel = urls.filter((u) => !existing.get(u));

    // Caption all remaining images in parallel
    const results = await Promise.allSettled(
      toLabel.map(async (url) => {
        const completion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0,
          max_tokens: 30,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: LABEL_PROMPT },
                { type: 'image_url', image_url: { url, detail: 'high' } },
              ],
            },
          ],
        });
        const label = cleanLabel(completion.choices[0]?.message?.content);
        return { url, label };
      }),
    );

    let labelled = 0;
    let unclear = 0;
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { url, label } = r.value;
      if (!label || label.toUpperCase() === 'UNCLEAR') {
        unclear++;
        continue;
      }
      await upsertImageCaption(url, label);
      labelled++;
    }

    return NextResponse.json({
      success: true,
      data: { labelled, unclear, skipped: urls.length - toLabel.length },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode },
      );
    }
    console.error('[admin/notes/images/autolabel] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Auto-labelling failed. Please try again.' } },
      { status: 500 },
    );
  }
}
